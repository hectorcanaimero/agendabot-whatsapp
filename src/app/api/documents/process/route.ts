import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateEmbeddings, splitTextIntoChunks, extractTextFromPDF } from '@/lib/embeddings/client';

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Get document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      throw new Error('Failed to download document');
    }

    // Convert to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Extract text from PDF
    const text = await extractTextFromPDF(buffer);

    if (!text || text.trim().length === 0) {
      await supabase
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', documentId);

      return NextResponse.json(
        { error: 'No text extracted from PDF' },
        { status: 400 }
      );
    }

    // Split into chunks
    const chunks = splitTextIntoChunks(text);

    // Generate embeddings for all chunks
    const embeddings = await generateEmbeddings(chunks);

    // Insert chunks with embeddings
    const chunksToInsert = chunks.map((content, index) => ({
      document_id: documentId,
      business_id: document.business_id,
      content,
      chunk_index: index,
      embedding: embeddings[index],
      metadata: {
        filename: document.original_filename,
        chunk_length: content.length,
      },
    }));

    const { error: insertError } = await supabase
      .from('document_chunks')
      .insert(chunksToInsert);

    if (insertError) {
      console.error('Error inserting chunks:', insertError);
      throw new Error('Failed to save document chunks');
    }

    // Update document status
    await supabase
      .from('documents')
      .update({
        status: 'completed',
        chunk_count: chunks.length,
      })
      .eq('id', documentId);

    return NextResponse.json({
      success: true,
      chunks: chunks.length,
    });
  } catch (error: any) {
    console.error('Error processing document:', error);

    // Update document status to failed
    if (request.json) {
      const { documentId } = await request.json();
      const supabase = await createServiceClient();
      await supabase
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', documentId);
    }

    return NextResponse.json(
      { error: error.message || 'Failed to process document' },
      { status: 500 }
    );
  }
}

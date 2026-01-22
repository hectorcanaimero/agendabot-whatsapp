import { createServiceClient } from '@/lib/supabase/server';
import { generateEmbedding } from './client';

export interface SearchResult {
  content: string;
  similarity: number;
  metadata: Record<string, any>;
  document_id: string;
}

/**
 * Search for relevant document chunks using semantic similarity
 */
export async function searchDocuments(
  businessId: string,
  query: string,
  limit: number = 5,
  similarityThreshold: number = 0.7
): Promise<SearchResult[]> {
  try {
    const supabase = await createServiceClient();

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Perform vector similarity search
    // Using cosine similarity with pgvector
    const { data, error } = await supabase.rpc('search_document_chunks', {
      query_embedding: queryEmbedding,
      match_business_id: businessId,
      match_count: limit,
      similarity_threshold: similarityThreshold,
    });

    if (error) {
      console.error('Error searching documents:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in searchDocuments:', error);
    return [];
  }
}

/**
 * Build context from search results for the AI agent
 */
export function buildContextFromResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return '';
  }

  const context = results
    .map((result, index) => {
      const source = result.metadata.filename || 'Documento';
      return `[Fonte ${index + 1}: ${source}]\n${result.content}`;
    })
    .join('\n\n---\n\n');

  return `CONTEXTO DA BASE DE CONHECIMENTO:\n\n${context}\n\n---\n\nUse as informações acima para responder a pergunta do cliente.`;
}

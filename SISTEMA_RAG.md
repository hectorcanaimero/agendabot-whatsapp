# Sistema RAG - Retrieval-Augmented Generation 🧠

## Visão Geral

O sistema AgendaBot agora possui **3 modos de operação** que permitem diferentes funcionalidades baseadas nas necessidades do negócio.

## Modos de Operação

### 1️⃣ Apenas Atendimento (Support Mode)
O agente responde perguntas dos clientes baseado em documentos PDF enviados.

**Características:**
- ✅ Responde apenas com base na base de conhecimento
- ✅ Busca semântica em documentos
- ✅ Cita fontes das respostas
- ❌ Não agenda consultas

**Ideal para:**
- FAQs e documentação
- Suporte técnico
- Informações de produtos/serviços
- Políticas e procedimentos

### 2️⃣ Apenas Agendamento (Scheduling Mode)
O agente foca exclusivamente em agendar consultas e gerenciar horários.

**Características:**
- ✅ Agenda consultas
- ✅ Consulta disponibilidade em tempo real
- ✅ Cancela agendamentos
- ✅ Integra com Google Calendar
- ❌ Não responde perguntas gerais

**Ideal para:**
- Clínicas médicas
- Salões de beleza
- Consultórios
- Serviços por agendamento

### 3️⃣ Híbrido (Hybrid Mode)
O agente combina ambas as funcionalidades: responde perguntas E agenda consultas.

**Características:**
- ✅ Responde perguntas com base em documentos
- ✅ Agenda consultas quando solicitado
- ✅ Proativo - oferece agendamento após responder
- ✅ Contexto completo do negócio

**Ideal para:**
- Negócios com atendimento complexo
- Clínicas com muitas dúvidas de pacientes
- Serviços que precisam educar antes de agendar

## Arquitetura Técnica

### Stack
- **Supabase Vector (pgvector)** - Armazenamento de embeddings
- **OpenAI ada-002** - Geração de embeddings (1536 dimensões)
- **pdf-parse** - Extração de texto de PDFs
- **DeepSeek** - Modelo de linguagem para respostas

### Fluxo de Processamento

```
1. Upload PDF → Supabase Storage
2. Extração de texto → pdf-parse
3. Chunking → Divisão em pedaços de 1000 caracteres
4. Embeddings → OpenAI ada-002
5. Armazenamento → Supabase Vector (document_chunks)
6. Busca → Similaridade de cosseno
7. Resposta → DeepSeek com contexto RAG
```

### Banco de Dados

#### Tabela `documents`
```sql
- id: UUID
- business_id: UUID (FK)
- filename: TEXT
- original_filename: TEXT
- file_path: TEXT (Supabase Storage)
- file_size: INTEGER
- status: TEXT (processing, completed, failed)
- chunk_count: INTEGER
- created_at: TIMESTAMPTZ
```

#### Tabela `document_chunks`
```sql
- id: UUID
- document_id: UUID (FK)
- business_id: UUID (FK)
- content: TEXT
- chunk_index: INTEGER
- embedding: vector(1536)
- metadata: JSONB
- created_at: TIMESTAMPTZ
```

#### Função RPC `search_document_chunks`
```sql
search_document_chunks(
  query_embedding vector(1536),
  match_business_id uuid,
  match_count int DEFAULT 5,
  similarity_threshold float DEFAULT 0.7
)
```

Retorna chunks ordenados por similaridade de cosseno.

## Como Usar

### 1. Configurar Variáveis de Ambiente

```env
# OpenAI para embeddings
OPENAI_API_KEY=sk-...

# Supabase com pgvector habilitado
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 2. Executar Schema SQL

Execute o schema atualizado no Supabase:

```sql
-- Habilitar extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Criar tabelas documents e document_chunks
-- (ver supabase/schema.sql completo)
```

### 3. Configurar Modo do Agente

1. Acesse **Configurações** no dashboard
2. Vá para aba **Agente**
3. Selecione o **Modo de Operação**:
   - Apenas Atendimento
   - Apenas Agendamento
   - Híbrido
4. Salve as configurações

### 4. Enviar Documentos (para modos Support e Hybrid)

1. Acesse **Documentos** no menu
2. Faça upload de arquivos PDF
3. Aguarde o processamento (automático)
4. Status "Concluído" indica que está pronto

### 5. Testar o Agente

Envie mensagens via WhatsApp:

**Modo Support:**
- "Quais são os horários de atendimento?"
- "Como funciona o procedimento X?"
- "Qual o valor da consulta?"

**Modo Scheduling:**
- "Quero agendar"
- "Tem horário amanhã?"
- "Preciso marcar consulta"

**Modo Hybrid:**
- Qualquer pergunta ou solicitação de agendamento

## Limites e Considerações

### Limites Técnicos
- **Tamanho máximo de PDF**: 10MB
- **Chunk size**: 1000 caracteres
- **Overlap**: 200 caracteres
- **Embedding dimension**: 1536 (OpenAI ada-002)
- **Similarity threshold**: 0.7 (70%)
- **Max results**: 5 chunks por busca

### Performance
- **Processamento de PDF**: 5-30 segundos (depende do tamanho)
- **Busca vetorial**: < 100ms (com índice ivfflat)
- **Geração de resposta**: 1-3 segundos (DeepSeek)

### Custos
- **OpenAI Embeddings**: ~$0.0001 por 1000 tokens
- **Supabase Storage**: Incluído no plano gratuito (1GB)
- **DeepSeek API**: ~$0.14 por 1M tokens

## Exemplos de Uso

### Exemplo 1: Clínica Médica (Modo Hybrid)

**Documentos enviados:**
- Procedimentos médicos
- Política de cancelamento
- Preparação para exames
- Convênios aceitos

**Conversa:**
```
Cliente: "Aceita convênio Unimed?"
Agente: "Sim! Aceitamos Unimed e outros convênios..."

Cliente: "Preciso fazer exame de sangue"
Agente: "Para exame de sangue, é necessário jejum de 12h..."
Agente: "Gostaria de agendar? Tenho disponível amanhã às 8h"

Cliente: "Sim, amanhã 8h"
Agente: "Perfeito! Qual seu nome completo?"
```

### Exemplo 2: Salão de Beleza (Modo Scheduling)

**Foco:** Apenas agendamento

**Conversa:**
```
Cliente: "Quero cortar cabelo"
Agente: "Ótimo! Para qual dia você prefere?"

Cliente: "Sexta-feira"
Agente: "Sexta-feira tenho disponível:
- 10:00
- 14:30
- 16:00"

Cliente: "14:30"
Agente: "Confirmado para sexta às 14:30!"
```

### Exemplo 3: Consultoria (Modo Support)

**Documentos enviados:**
- Metodologia de trabalho
- Casos de sucesso
- Preços e pacotes
- Termos de serviço

**Conversa:**
```
Cliente: "Como funciona a consultoria?"
Agente: "Nossa consultoria funciona em 3 etapas..."
Agente: [Responde baseado nos documentos]

Cliente: "Qual o valor?"
Agente: "Temos 3 pacotes disponíveis..."
Agente: [Cita preços dos documentos]
```

## Troubleshooting

### Problema: Documento não processa

**Possíveis causas:**
- PDF corrompido ou protegido por senha
- Arquivo muito grande (>10MB)
- Sem texto extraível (imagens escaneadas)

**Solução:**
- Verificar integridade do PDF
- Reduzir tamanho do arquivo
- Usar OCR antes de enviar

### Problema: Agente não encontra informações

**Possíveis causas:**
- Similarity threshold muito alto
- Pergunta muito diferente do conteúdo
- Poucos documentos na base

**Solução:**
- Ajustar threshold (padrão 0.7)
- Adicionar mais documentos
- Reformular pergunta

### Problema: Respostas genéricas

**Possíveis causas:**
- Modo incorreto selecionado
- Documentos não processados
- Contexto insuficiente

**Solução:**
- Verificar modo do agente
- Confirmar status "Concluído" dos documentos
- Adicionar mais conteúdo relevante

## Melhorias Futuras

### Curto Prazo
- [ ] Suporte para outros formatos (Word, TXT, Markdown)
- [ ] Preview de documentos antes do upload
- [ ] Estatísticas de uso da base de conhecimento
- [ ] Busca manual na interface

### Médio Prazo
- [ ] Chunking inteligente (por seção/parágrafo)
- [ ] Reranking de resultados
- [ ] Cache de embeddings
- [ ] Versionamento de documentos

### Longo Prazo
- [ ] Fine-tuning do modelo
- [ ] Multi-idioma
- [ ] Integração com URLs e websites
- [ ] Aprendizado contínuo com feedback

## Referências

- [Supabase Vector Documentation](https://supabase.com/docs/guides/ai/vector-columns)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [RAG Best Practices](https://www.pinecone.io/learn/retrieval-augmented-generation/)

---

**Data de implementação**: Janeiro 2025  
**Versão**: 3.0  
**Status**: ✅ Implementado e Funcional

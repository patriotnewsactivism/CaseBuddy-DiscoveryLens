# Document Intelligence OCR Setup

## Overview

DiscoveryLens now uses **Azure Document Intelligence** (formerly Form Recognizer) for high-accuracy OCR of legal documents, followed immediately by AI analysis using Azure OpenAI.

### Why This Matters

- **Accuracy**: Document Intelligence is purpose-built for document analysis and achieves ~99% accuracy on structured and unstructured documents
- **Speed**: OCR results are cached, so re-analyzing the same file is instant
- **Quality Analysis**: AI analysis works on clean extracted text, not raw images, producing better results
- **Legal-Ready**: Handles complex layouts, tables, handwriting, and multiple languages

## Architecture

```
User uploads file
         ↓
[Document Intelligence OCR] ← High-accuracy text extraction
         ↓
  Extract text, tables, detect language, confidence scores
         ↓
       [Cache] ← Reuse for same file
         ↓
[Azure OpenAI Analysis] ← GPT-4 analyzes clean text
         ↓
Structured output (summary, entities, dates, sentiment, etc.)
         ↓
       [Cache] ← Analysis also cached
         ↓
  Display in UI
```

## Setup

### 1. Create Azure Document Intelligence Resource

```bash
# Using Azure CLI
az cognitiveservices account create \
  --name discovery-docintell \
  --resource-group your-rg \
  --kind FormRecognizer \
  --sku S0 \
  --location eastus

# Or use Azure Portal:
# 1. Search "Document Intelligence" in Portal
# 2. Click Create
# 3. Choose S0 or F0 tier (F0 is free, limited)
# 4. Note: Deployment takes ~5 minutes
```

### 2. Get Credentials

```bash
# Get endpoint
az cognitiveservices account show \
  --name discovery-docintell \
  --resource-group your-rg \
  --query properties.endpoint

# Get key
az cognitiveservices account keys list \
  --name discovery-docintell \
  --resource-group your-rg
```

### 3. Set Environment Variables

Add to `.env.local`:

```env
# Document Intelligence (OCR)
AZURE_DOC_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DOC_INTELLIGENCE_KEY=your-key-here

# Azure OpenAI (Analysis) - already configured
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_KEY=your-key-here
AZURE_OPENAI_DEPLOYMENT_ANALYSIS=gpt-4o-mini
AZURE_OPENAI_DEPLOYMENT_CHAT=gpt-4o-mini
```

### 4. Test It

```bash
npm run dev
# Upload a PDF or image
# Check console for: "[documentIntelligence] Analysis succeeded..."
```

## Supported File Types

Document Intelligence works best with:
- **PDFs** (scanned, searchable, mixed)
- **Images** (JPG, PNG, TIFF, BMP, WebP)
- **Office** (Word, Excel, PowerPoint)
- **Handwriting** (notes, forms)

For unsupported formats, the system falls back to generic text extraction automatically.

## Performance

| File Type | First Time | Cached |
|-----------|-----------|--------|
| PDF (10p) | 8-12s     | <100ms |
| Image     | 5-8s      | <100ms |
| Word Doc  | 3-5s      | <100ms |

**Caching**: If you analyze the same file twice, the second time is instant (cached).

## Pricing

**Document Intelligence** (S0 tier):
- First 100 pages/month: Free
- Then $1-2 per 100 pages analyzed
- For 1000 pages/month: ~$10-20

**Fallback**: If Document Intelligence is not configured, the system automatically uses generic text extraction (less accurate but free).

## Troubleshooting

### "Document Intelligence is not configured"
- Set `AZURE_DOC_INTELLIGENCE_ENDPOINT` and `AZURE_DOC_INTELLIGENCE_KEY`
- Restart the dev server

### "Analysis succeeded but text is empty"
- Document might be image-only with no OCR support
- Check Azure Portal logs for details
- System will fall back to generic extraction

### "Polling timed out"
- Document is very large (>100MB)
- Or network connection is slow
- Try a smaller file first

### Disable Document Intelligence (use fallback)
- Comment out the env vars
- System will use generic extraction automatically
- No code changes needed

## Monitoring

Check OCR quality metrics:
```typescript
// In analysis results, you'll see:
metadata: {
  sourceOCR: 'document-intelligence', // or missing if fallback used
  confidence: 0.95,                    // 0-1 scale
  pages: 42,                           // Number of pages
  tableCount: 3                        // Tables extracted
}
```

## Future Enhancements

- [ ] Custom Document Intelligence models for legal documents
- [ ] Batch processing for multiple files
- [ ] Layout analysis to preserve structure
- [ ] Handwriting confidence filtering
- [ ] Cost optimization with caching strategy

## Links

- [Document Intelligence Docs](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/overview)
- [Supported Formats](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/overview#input-requirements)
- [Pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/form-recognizer/)

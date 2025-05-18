import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';
import OpenAI from 'openai';
import mammoth from 'mammoth';
import { Document as DocxDocument, Packer, Paragraph, TextRun } from 'docx';
import { PDFDocument, rgb } from 'pdf-lib';
import Tesseract from 'tesseract.js';
import faker from 'faker';
import nlp from 'compromise';
import sharp from 'sharp';
import { anonymizeText } from './utils/anonymizer.js';
import rateLimit from 'express-rate-limit';

// Fix for ES modules __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const requiredEnvVars = ['OPENAI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Directories
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const OUTPUT_DIR = path.join(__dirname, 'outputs');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  }
});

// Serve UI
app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), 'public')));

// Health check
app.get('/', (_req, res) => res.send('👋 Server is up!'));

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'No message provided' });
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { 
          role: 'system', 
          content: 'You are a helpful assistant for a data anonymization web app. Answer user questions about anonymization, privacy, and how to use the app.' 
        },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 150
    });
    
    res.json({ reply: response.choices[0].message.content.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const allowedExtensions = ['.txt', '.docx', '.pdf', '.png', '.jpg', '.jpeg'];

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    fs.unlinkSync(req.file.path); // Clean up invalid file
    return res.status(400).json({ error: 'Invalid file type' });
  }
  
  res.json({ filename: req.file.filename });
});

// Anonymize endpoint
app.post('/anonymize', async (req, res) => {
  const inputPath = path.join(UPLOAD_DIR, req.body.filename);
  const outputFilename = `anon-${Date.now()}-${req.body.filename}`;
  const outputPath = path.join(OUTPUT_DIR, outputFilename);

  try {
    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ error: 'Input file not found' });
    }

    const ext = path.extname(req.body.filename).toLowerCase();
    const mode = req.body.mode || 'mask';

    // Process file based on extension
    switch (ext) {
      case '.txt':
        const text = fs.readFileSync(inputPath, 'utf8');
        fs.writeFileSync(outputPath, anonymizeText(text, mode), 'utf8');
        break;

      case '.docx':
        try {
          console.log('Starting DOCX processing...');
          console.log('Input path:', inputPath);
          
          const { value } = await mammoth.extractRawText({ path: inputPath });
          console.log('Extracted text length:', value?.length || 0);
          
          if (!value) throw new Error('Failed to extract text from DOCX');
          
          const anonymized = anonymizeText(value, mode);
          console.log('Anonymized text length:', anonymized.length);
          
          // Create a new document with required properties
          const doc = new DocxDocument({
            creator: "Anonymizer",
            title: "Anonymized Document",
            description: "Document processed by anonymization service",
            sections: [{
              properties: {},
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: anonymized,
                      size: 24
                    })
                  ]
                })
              ]
            }]
          });
          
          // Save the document
          const buffer = await Packer.toBuffer(doc);
          await fs.promises.writeFile(outputPath, buffer);
          console.log('DOCX processing completed successfully');
          break;
        } catch (docxError) {
          console.error('Detailed DOCX error:', docxError);
          throw new Error(`Failed to process DOCX file: ${docxError.message}`);
        }

      case '.pdf':
        try {
          // Load the PDF
          const pdfData = fs.readFileSync(inputPath);
          const pdfDoc = await PDFDocument.load(pdfData);
          const pages = pdfDoc.getPages();
          
          // Process each page
          for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const { width, height } = page.getSize();
            
            // Define sensitive areas based on resume layout
            const sensitiveAreas = [
              { y: height - 80, height: 80, width }, // Name area
              { y: height - 130, height: 50, width }, // Contact info
              { y: height - 200, height: 70, width }, // Education section header
              { y: height - 280, height: 80, width }, // School details
              { y: height - 380, height: 100, width }, // Test scores
            ];
            
            // Cover sensitive information with white rectangles
            sensitiveAreas.forEach(area => {
              page.drawRectangle({
                x: 0,
                y: area.y,
                width: area.width,
                height: area.height,
                color: rgb(1, 1, 1), // White
                opacity: 1
              });
            });
            
            // Add replacement text
            page.drawText('ANONYMIZED RESUME', {
              x: 50,
              y: height - 50,
              size: 24,
              color: rgb(0, 0, 0)
            });
            
            page.drawText('Contact information hidden', {
              x: 50,
              y: height - 100,
              size: 12,
              color: rgb(0, 0, 0)
            });
          }
          
          // Save the modified PDF
          const pdfBytes = await pdfDoc.save();
          fs.writeFileSync(outputPath, pdfBytes);
          
        } catch (pdfError) {
          console.error('PDF processing error:', pdfError);
          throw new Error('Failed to process PDF file: ' + pdfError.message);
        }
        break;

      case '.png':
      case '.jpg':
      case '.jpeg':
        try {
          console.log('Starting image processing...');
          
          // Load image using sharp
          const image = sharp(inputPath);
          const metadata = await image.metadata();
          
          // Perform OCR using Tesseract
          const result = await Tesseract.recognize(inputPath, {
            logger: m => console.log(m),
            lang: 'eng',
            oem: 1,
            psm: 3,
          });

          if (result?.data?.words?.length) {
            // Create overlays for detected text
            const overlays = result.data.words.map(word => ({
              input: Buffer.from(
                `<svg>
                  <rect 
                    x="0" 
                    y="0" 
                    width="${word.bbox.x1 - word.bbox.x0 + 4}" 
                    height="${word.bbox.y1 - word.bbox.y0 + 4}" 
                    fill="${mode === 'mask' ? 'black' : 'white'}"
                    rx="2"
                    ry="2"
                  />
                  ${mode !== 'mask' ? `
                    <text 
                      x="${(word.bbox.x1 - word.bbox.x0) / 2}" 
                      y="${(word.bbox.y1 - word.bbox.y0) / 2}" 
                      font-family="Arial" 
                      font-size="12" 
                      fill="black" 
                      text-anchor="middle" 
                      dominant-baseline="middle"
                    >[REDACTED]</text>
                  ` : ''}
                </svg>`
              ),
              top: Math.max(0, word.bbox.y0 - 2),
              left: Math.max(0, word.bbox.x0 - 2),
              blend: 'over'
            }));

            // Apply overlays to image
            await image
              .composite(overlays)
              .toFormat(ext.substring(1)) // Convert to the same format as input
              .toFile(outputPath);
            
            console.log(`Processed image with ${result.data.words.length} detected text regions`);
          } else {
            // If no text detected, copy original file
            console.log('No text detected in image');
            fs.copyFileSync(inputPath, outputPath);
          }
          break;
        } catch (imgError) {
          console.error('Image processing error:', imgError);
          throw new Error(`Failed to process image file: ${imgError.message}`);
        }

      default:
        fs.copyFileSync(inputPath, outputPath);
    }

    // Clean up input file immediately and schedule output file cleanup
    cleanupFiles(inputPath, outputPath);

    res.json({
      success: true,
      output_file: outputFilename,
      message: 'File anonymized successfully'
    });

  } catch (err) {
    console.error('Anonymization error:', err);
    res.status(500).json({ error: err.message });
    
    // Clean up files in case of error
    cleanupFiles(inputPath, outputPath);
  }
});

// Update the download endpoint
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(OUTPUT_DIR, filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Determine content type based on file extension
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.txt': 'text/plain',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg'
  };

  const contentType = contentTypes[ext] || 'application/octet-stream';

  // Set proper headers for file download
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-cache');
  
  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.on('error', (error) => {
    console.error('Error streaming file:', error);
    res.status(500).json({ error: 'Error streaming file' });
  });
  
  fileStream.pipe(res);
});

// Add cleanup function after the download endpoint
function cleanupFiles(inputPath, outputPath) {
  const cleanup = (path) => {
    try {
      if (fs.existsSync(path)) {
        fs.unlinkSync(path);
        console.log(`Cleaned up file: ${path}`);
      }
    } catch (err) {
      console.error(`Cleanup error for ${path}:`, err);
    }
  };

  // Clean input file immediately
  cleanup(inputPath);

  // Schedule output file cleanup
  if (outputPath) {
    setTimeout(() => cleanup(outputPath), 5 * 60 * 1000);
  }
}

// Make rate limiting optional
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to specific routes only
app.use('/upload', limiter);
app.use('/anonymize', limiter);

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🔒 Server listening on http://localhost:${PORT}`));

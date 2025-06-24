# PowerPoint Review System

An AI-powered web application designed for management consulting firms to review PowerPoint presentations for grammatical errors, professional writing improvements, narrative flow analysis, and visual formatting issues using OpenAI's GPT-4o (including Vision capabilities).

## Features

### Primary Features
- **Grammar & Spelling Review**: Catch spelling errors, grammatical mistakes, and punctuation issues
- **Professional Writing Suggestions**: Improve clarity, tone, and professionalism
- **Narrative Flow Analysis**: Analyze presentation structure and logical flow
- **Visual QA (Vision)**: Detect formatting, alignment, and branding issues using slide images

### Technical Features
- Drag-and-drop file upload interface
- Real-time processing with progress indicators
- Tabbed results display
- Export functionality
- Responsive design for desktop and tablet

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Lucide React icons
- **File Upload**: React Dropzone
- **State Management**: React hooks
- **Notifications**: React Hot Toast

### Backend
- **API**: Next.js API Routes
- **AI Integration**: OpenAI GPT-4o (Vision)
- **File Processing**: Custom PowerPoint text extraction and slide image conversion
- **File Storage**: Temporary local storage

## Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd powerpoint-review-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   NEXTAUTH_SECRET=your_nextauth_secret_here
   NEXTAUTH_URL=http://localhost:3000
   MAX_FILE_SIZE=52428800
   UPLOAD_DIR=./temp
   ```

4. **Get your OpenAI API key**
   - Sign up at [OpenAI Platform](https://platform.openai.com/)
   - Create an API key
   - Add it to your `.env.local` file

## Getting Started

First, install the dependencies and set up your environment:

```bash
npm install

# Create a .env.local file and add your OpenAI API key
cp .env.example .env.local
# Now, edit .env.local with your key

# This project uses a Python script for parsing PowerPoint files.
# You need to have Python installed and in your system's PATH.
# Install the required Python library:
pip install python-pptx
```

Next, run the development server:

```bash
npm run dev
```

## Usage

1. **Upload a PowerPoint file**
   - Drag and drop a .pptx or .ppt file onto the upload area
   - Or click to select a file from your computer

2. **Wait for processing**
   - The system will extract text from your slides
   - OpenAI GPT-4o will analyze the content and/or slide images
   - Progress indicators will show the current status

3. **Review results**
   - **Grammar & Spelling**: View and fix grammatical errors
   - **Writing Suggestions**: See professional writing improvements
   - **Narrative Flow**: Analyze presentation structure
   - **Vision QA**: Review visual formatting and design issues

4. **Export results**
   - Click the "Export Report" button to download results

## File Requirements

- **Supported formats**: .pptx, .ppt
- **Maximum file size**: 50MB
- **Maximum slides**: 100 slides per presentation
- **Processing time**: 10-30 seconds depending on file size

## API Endpoints

### POST /api/review
Upload and analyze a PowerPoint file (text-based analysis).

### POST /api/vision
Upload and analyze a PowerPoint file (vision-based analysis).

**Request:**
- Content-Type: multipart/form-data
- Body: FormData with 'file' field containing PowerPoint file

**Response:**
```json
{
  "fileName": "presentation.pptx",
  "totalSlides": 10,
  "grammarErrors": [...],
  "writingSuggestions": [...],
  "flowAnalysis": [...],
  "visionFindings": [...],
  "summary": {
    "totalErrors": 5,
    "totalSuggestions": 3,
    "overallScore": 85,
    "processingTime": 15000
  }
}
```

## Project Structure

```
├── app/
│   ├── api/
│   │   └── review/
│   │       └── route.ts          # API endpoint for file review
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page
├── components/
│   ├── FileUpload.tsx            # File upload component
│   ├── Header.tsx                # Header component
│   └── ReviewResults.tsx         # Results display component
├── types/
│   └── review.ts                 # TypeScript type definitions
├── temp/                         # Temporary file storage
├── package.json                  # Dependencies and scripts
├── tailwind.config.js           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

## Customization

### Styling
- Modify `tailwind.config.js` to change colors and theme
- Update `app/globals.css` for custom styles

### AI Analysis
- Edit the prompt in `app/api/review/route.ts` to customize OpenAI's analysis
- Adjust scoring algorithms in the `analyzePresentation` function

### File Processing
- Implement proper PowerPoint parsing in `extractTextFromPowerPoint` function
- Add support for additional file formats

## Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms
- Ensure Node.js 18+ support
- Set environment variables
- Configure file upload limits

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js | No |
| `NEXTAUTH_URL` | Your application URL | No |
| `MAX_FILE_SIZE` | Maximum file size in bytes | No |
| `UPLOAD_DIR` | Directory for temporary files | No |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team

## Roadmap

### Phase 2 Features
- Batch processing for multiple files
- Custom style guide integration
- Team collaboration features
- PowerPoint add-in integration

### Phase 3 Features
- Advanced analytics dashboard
- Custom AI model training
- Multi-language support
- Mobile application 
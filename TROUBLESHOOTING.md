# File Upload Troubleshooting Guide

If you're experiencing file upload failures, follow these steps to identify and resolve the issue:

## 1. Check Browser Console

Open your browser's Developer Tools (F12) and check the Console tab for error messages. The improved error handling will now show detailed information about what's failing.

## 2. Common Issues and Solutions

### Missing API Key
**Error**: "API key not configured" or "Authentication failed"
**Solution**: 
1. Create a `.env.local` file in your project root
2. Add your Anthropic API key: `ANTHROPIC_API_KEY=your_key_here`
3. Restart the development server

### Invalid File Type
**Error**: "Invalid file type"
**Solution**: 
- Only PowerPoint files (.pptx, .ppt) are supported
- Make sure your file has the correct extension
- Try saving the file in a different PowerPoint format

### File Too Large
**Error**: "File size exceeds 50MB limit"
**Solution**: 
- Compress your PowerPoint file
- Remove unnecessary images or media
- Split large presentations into smaller files

### Empty File
**Error**: "File appears to be empty"
**Solution**: 
- Make sure the file contains actual content
- Try opening and resaving the file in PowerPoint

### Network Issues
**Error**: "Failed to process file" or network timeouts
**Solution**: 
- Check your internet connection
- Try uploading a smaller file first
- Check if your firewall is blocking the request

### Server Errors
**Error**: "Server error: 500" or similar
**Solution**: 
- Check the terminal where you're running `npm run dev` for detailed error logs
- Make sure all dependencies are installed: `npm install`
- Try restarting the development server

## 3. Debugging Steps

1. **Check File Details**: The console will now log file name, size, type, and modification date
2. **Monitor API Calls**: Watch the Network tab in Developer Tools to see the request/response
3. **Review Server Logs**: Check the terminal output for detailed error information
4. **Test with Sample File**: Try uploading a simple PowerPoint file with just text content

## 4. Environment Setup

Make sure you have:
- Node.js 18+ installed
- All dependencies installed: `npm install`
- Anthropic API key configured in `.env.local`
- Development server running: `npm run dev`

## 5. File Requirements

- **Format**: PowerPoint (.pptx, .ppt) only
- **Size**: Maximum 50MB
- **Content**: Should contain text content (images-only slides may cause issues)
- **Slides**: Up to 100 slides recommended

## 6. Getting Help

If you're still experiencing issues:
1. Check the browser console for specific error messages
2. Look at the terminal output for server-side errors
3. Try uploading a different PowerPoint file
4. Ensure your Anthropic API key is valid and has sufficient credits 
# Monday.com Integration App

This application integrates with Monday.com to manage jobs and tyre bay items.

## Vercel Deployment

To deploy this application to Vercel, follow these steps:

1.  **Export the code**: Export the code from AI Studio and push it to a GitHub repository.
2.  **Connect to Vercel**: Import the repository into Vercel.
3.  **Configure Environment Variables**:
    -   Add `MONDAY_API_KEY` to your Vercel project's environment variables.
    -   Add any other required environment variables (e.g., Firebase config if used).
4.  **Build Settings**: Vercel should automatically detect the Vite project.
    -   Build Command: `npm run build`
    -   Output Directory: `dist`
5.  **Deploy**: Vercel will build the frontend and deploy the `api/` directory as serverless functions.

## Project Structure

-   `src/`: Frontend React application.
-   `server.ts`: Express server handling API requests and serving the app in development/production.
-   `api/index.ts`: Entry point for Vercel serverless functions.
-   `vercel.json`: Vercel configuration for routing and SPA support.

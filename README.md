This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Google Drive Backup Setup

This application has been migrated from Cloudinary to a secure Service-Account-based Google Drive backup storage system. Follow the steps below to configure it:

### 1. Enable Google Drive API & Create Service Account
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Enable the **Google Drive API**:
   - Go to **APIs & Services > Library**.
   - Search for **Google Drive API** and click **Enable**.
4. Create a **Service Account**:
   - Go to **IAM & Admin > Service Accounts**.
   - Click **Create Service Account**, fill in details, and click **Done**.
5. Generate a **JSON Key**:
   - Select your newly created service account.
   - Go to the **Keys** tab, click **Add Key > Create new key**, choose **JSON**, and download the file.

### 2. Configure Environment Variables
Copy the Service Account details from the downloaded JSON file to your `.env` file:
*   `GOOGLE_PROJECT_ID`: The `project_id` value from the JSON.
*   `GOOGLE_SERVICE_ACCOUNT_EMAIL`: The `client_email` value from the JSON.
*   `GOOGLE_PRIVATE_KEY`: The `private_key` value from the JSON. Make sure it contains `\n` characters (surrounded by quotes in your `.env` file).

### 3. Share Google Drive Folder with Service Account
1. Create a folder in your Google Drive (e.g., name it `school-backups`).
2. Copy the folder ID from the URL. (The folder ID is the long string of alphanumeric characters at the end of the URL when viewing the folder, e.g., `https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ`).
3. Set `GOOGLE_DRIVE_FOLDER_ID` in your `.env` file to this folder ID.
4. Share the folder:
   - Right-click the folder in Google Drive and select **Share**.
   - Paste the Service Account email (e.g. `chhotelal@skilful-bearing-500810-j3.iam.gserviceaccount.com`).
   - Give it **Editor** permissions, and click **Share**.


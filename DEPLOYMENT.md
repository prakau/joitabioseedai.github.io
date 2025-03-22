# Deploying JOITA BIOSEED AI Website to GitHub Pages

## Prerequisites
1. GitHub account
2. Git installed on your local machine
3. Basic command line knowledge

## Step 1: Repository Setup
1. Create a new GitHub repository named `joitabioseedai.github.io`
   - Go to github.com
   - Click "New repository"
   - Name it `joitabioseedai.github.io`
   - Make it public
   - Initialize with README

2. Clone the repository locally:
```bash
git clone https://github.com/joitabioseedai/joitabioseedai.github.io.git
cd joitabioseedai.github.io
```

## Step 2: File Organization
1. Copy all website files to the repository:
   - HTML files (index.html, pages/*.html)
   - CSS files (css/*)
   - JavaScript files (js/*)
   - Images (images/*)

2. Remove unnecessary files:
   - .DS_Store files
   - Python files (*.py)
   - Configuration files (postcss.config.js, tailwind.config.js, vite.config.js)
   - Documents folder

## Step 3: GitHub Pages Configuration
1. Go to repository settings:
   - Settings > Pages
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)
   - Save

## Step 4: Initial Deployment
1. Add files to Git:
```bash
git add .
git commit -m "Initial website deployment"
git push origin main
```

2. Verify deployment:
   - Visit https://joitabioseedai.github.io
   - Wait a few minutes for changes to propagate

## Step 5: Custom Domain Setup (Optional)
1. Buy domain (e.g., joitabioseedai.com)

2. Add custom domain in GitHub:
   - Settings > Pages
   - Custom domain: www.joitabioseedai.com
   - Save
   - Wait for DNS check

3. Configure DNS with your provider:
   Add these records:
   ```
   A     185.199.108.153
   A     185.199.109.153
   A     185.199.110.153
   A     185.199.111.153
   CNAME www  joitabioseedai.github.io
   ```

## Step 6: HTTPS Setup
1. Enable HTTPS in GitHub Pages settings
2. Wait for certificate provisioning (can take up to 24 hours)

## Step 7: Maintenance
1. Regular updates:
```bash
git add .
git commit -m "Update description"
git push origin main
```

2. Monitor GitHub Pages status:
   - Check Settings > Pages for deployment status
   - Review Actions tab for build logs

## Common Issues and Solutions
1. **404 Errors**: Check file paths and case sensitivity
2. **CSS/JS Not Loading**: Ensure paths are relative to root
3. **Custom Domain Not Working**: DNS propagation can take 24-48 hours

## Best Practices
1. Always test locally before pushing changes
2. Use descriptive commit messages
3. Regularly backup your repository
4. Keep dependencies minimal for faster loading
5. Monitor site performance using GitHub's insights

## Support Resources
- GitHub Pages Documentation: https://docs.github.com/pages
- GitHub Support: https://support.github.com
- DNS Configuration Help: https://docs.github.com/pages/configuring-a-custom-domain
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

## Step 5: Custom Domain Setup

### Purchasing a Domain (Affordable Options)

1. **Namecheap** (Recommended)
   - Visit namecheap.com
   - Often has domains for $0.99-$8.88 first year
   - Excellent DNS management interface
   - 24/7 customer support

2. **Google Domains**
   - Visit domains.google
   - Transparent pricing ($12-15/year)
   - Simple interface
   - Includes privacy protection

3. **Cloudflare Registrar**
   - Visit cloudflare.com/products/registrar
   - At-cost pricing (no markup)
   - Additional security features
   - Free privacy protection

### Setting Up Your Custom Domain

1. After purchasing your domain (e.g., joitabioseedai.com), go to GitHub:
   - Repository Settings > Pages
   - Under "Custom domain", enter: www.joitabioseedai.com
   - Click Save
   - Check "Enforce HTTPS" (after DNS is configured)

2. Configure DNS with your provider:
   Add these records:
   ```
   # Point apex domain to GitHub Pages
   A     185.199.108.153
   A     185.199.109.153
   A     185.199.110.153
   A     185.199.111.153

   # Set up www subdomain
   CNAME www  prakau.github.io
   ```

3. Wait for DNS propagation (can take up to 48 hours)
   - GitHub will show a green checkmark when verified
   - You can check propagation at whatsmydns.net

### Domain Management Best Practices

1. **Auto-renewal**: Enable it to prevent domain expiration

2. **Privacy Protection**:
   - Most registrars offer free WHOIS privacy
   - Prevents personal information exposure

3. **Security Features**:
   - Enable 2FA on your registrar account
   - Use a strong password
   - Lock your domain to prevent unauthorized transfers

4. **SSL/HTTPS**:
   - GitHub Pages provides free SSL certificates
   - Wait for DNS propagation before enabling HTTPS

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

### Troubleshooting Custom Domains

1. **DNS Not Resolving**
   - Verify A records are correct
   - Check CNAME record points to your GitHub Pages URL
   - Use `dig` command to check DNS propagation:
     ```bash
     dig WWW.YOURDOMAIN.COM +nostats +nocomments +nocmd
     ```

2. **HTTPS Not Working**
   - Ensure DNS is fully propagated
   - Remove and re-add custom domain in GitHub Pages settings
   - Wait up to 24 hours for SSL certificate provisioning

3. **404 Errors**
   - Verify repository name matches GitHub Pages requirements
   - Check if site is being built from correct branch
   - Ensure index.html is in root directory

4. **Custom Domain Disappearing**
   - Add CNAME file to repository root with your domain
   - Ensure CNAME file is in the correct branch
   - Check if GitHub Actions workflow preserves CNAME file

## Best Practices
1. Always test locally before pushing changes
2. Use descriptive commit messages
3. Regularly backup your repository
4. Keep dependencies minimal for faster loading
5. Monitor site performance using GitHub's insights
6. Keep domain registration details current
7. Document DNS settings for future reference
8. Set calendar reminders for domain renewal

## Support Resources
- GitHub Pages Documentation: https://docs.github.com/pages
- GitHub Support: https://support.github.com
- DNS Configuration Help: https://docs.github.com/pages/configuring-a-custom-domain
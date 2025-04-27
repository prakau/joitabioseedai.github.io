#!/bin/bash

# Update CSS links in all HTML files
find pages -name "*.html" -type f -exec sed -i '' 's/<link rel="stylesheet" href="..\/css\/navigation.css">/<link rel="stylesheet" href="..\/css\/navigation.css">\n    <link rel="stylesheet" href="..\/css\/mobile.css">/' {} \;

# Update JavaScript imports in all HTML files
find pages -name "*.html" -type f -exec sed -i '' 's/<script src="..\/js\/navigation-loader-new.js"><\/script>/<script src="..\/js\/navigation-loader-new.js"><\/script>\n    <script src="..\/js\/mobile-nav.js"><\/script>/' {} \;

# Update agri-assistant.html file
sed -i '' 's/<link rel="stylesheet" href="css\/navigation.css">/<link rel="stylesheet" href="css\/navigation.css">\n    <link rel="stylesheet" href="css\/mobile.css">/' agri-assistant.html
sed -i '' 's/<script src="js\/navigation-loader-new.js"><\/script>/<script src="js\/navigation-loader-new.js"><\/script>\n    <script src="js\/mobile-nav.js"><\/script>/' agri-assistant.html

echo "Mobile updates completed!"

#!/bin/bash

# This script updates the navigation on all HTML pages to ensure consistency

# List of pages to update (excluding those we've already updated)
PAGES=(
  "pages/technology.html"
  "pages/sustainability.html"
  "pages/farmers.html"
  "pages/investors.html"
  "pages/news.html"
  "pages/contact-us.html"
  "pages/what-makes-us-different.html"
  "pages/north-star.html"
  "pages/products/nano-pesticides.html"
)

# Function to add CSS links
add_css_links() {
  local file=$1
  # Check if the file already has the navigation.css link
  if ! grep -q "navigation.css" "$file"; then
    # Find the line with animations.css and add our new CSS links after it
    sed -i '' 's/<link rel="stylesheet" href="..\/css\/animations.css">/<link rel="stylesheet" href="..\/css\/animations.css">\n    <link rel="stylesheet" href="..\/css\/fonts.css">\n    <link rel="stylesheet" href="..\/css\/navigation.css">/' "$file"
  fi
}

# Function to update navigation
update_navigation() {
  local file=$1
  
  # Determine the path prefix based on the file depth
  local path_prefix="../"
  if [[ "$file" == *"products/"* ]]; then
    path_prefix="../../"
  fi
  
  # Create the navigation HTML
  local nav_html="    <header>\n        <div class=\"navbar\">\n            <a href=\"${path_prefix}index.html\" id=\"nav-home\">Home</a>\n            <a href=\"${path_prefix}pages/about-us.html\" id=\"nav-about\">About</a>\n            <a href=\"${path_prefix}pages/products.html\" id=\"nav-products\">Products</a>\n            <a href=\"${path_prefix}pages/technology.html\" id=\"nav-technology\">Technology</a>\n            <a href=\"${path_prefix}pages/sustainability.html\" id=\"nav-sustainability\">Sustainability</a>\n            <a href=\"${path_prefix}pages/farmers.html\" id=\"nav-farmers\">Farmers</a>\n            <a href=\"${path_prefix}pages/investors.html\" id=\"nav-investors\">Investors</a>\n            <a href=\"${path_prefix}pages/news.html\" id=\"nav-news\">News</a>\n            <a href=\"${path_prefix}pages/contact-us.html\" id=\"nav-contact\">Contact</a>\n            <a href=\"${path_prefix}agri-assistant.html\" id=\"nav-assistant\">Agri-Smart Assistant</a>\n        </div>\n    </header>"
  
  # Replace the existing header/navigation with our standardized one
  # This is a simplified approach - in a real scenario, you might need more robust pattern matching
  sed -i '' 's/<header class="animated-header">.*<\/header>/<header>\n        <div class="navbar">\n            <a href="'${path_prefix}'index.html" id="nav-home">Home<\/a>\n            <a href="'${path_prefix}'pages\/about-us.html" id="nav-about">About<\/a>\n            <a href="'${path_prefix}'pages\/products.html" id="nav-products">Products<\/a>\n            <a href="'${path_prefix}'pages\/technology.html" id="nav-technology">Technology<\/a>\n            <a href="'${path_prefix}'pages\/sustainability.html" id="nav-sustainability">Sustainability<\/a>\n            <a href="'${path_prefix}'pages\/farmers.html" id="nav-farmers">Farmers<\/a>\n            <a href="'${path_prefix}'pages\/investors.html" id="nav-investors">Investors<\/a>\n            <a href="'${path_prefix}'pages\/news.html" id="nav-news">News<\/a>\n            <a href="'${path_prefix}'pages\/contact-us.html" id="nav-contact">Contact<\/a>\n            <a href="'${path_prefix}'agri-assistant.html" id="nav-assistant">Agri-Smart Assistant<\/a>\n        <\/div>\n    <\/header>/g' "$file"
}

# Function to add navigation.js script
add_navigation_script() {
  local file=$1
  
  # Determine the path prefix based on the file depth
  local path_prefix="../"
  if [[ "$file" == *"products/"* ]]; then
    path_prefix="../../"
  fi
  
  # Check if the file already has the navigation.js script
  if ! grep -q "navigation.js" "$file"; then
    # Add the navigation.js script before the closing body tag
    sed -i '' 's/<script src="'${path_prefix}'js\/main.js"><\/script>/<script src="'${path_prefix}'js\/main.js"><\/script>\n    <script src="'${path_prefix}'js\/navigation.js"><\/script>/' "$file"
  fi
}

# Process each page
for page in "${PAGES[@]}"; do
  if [ -f "$page" ]; then
    echo "Updating $page..."
    add_css_links "$page"
    update_navigation "$page"
    add_navigation_script "$page"
  else
    echo "Warning: $page not found"
  fi
done

echo "Navigation update complete!"

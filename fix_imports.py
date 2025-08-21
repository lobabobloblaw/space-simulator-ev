#!/usr/bin/env python3
"""Fix all relative imports to absolute imports in system files"""

import os
import re

# Directory containing the system files
systems_dir = '/Users/alexvoigt/Documents/Claude/space-simulator-ev/docs/js/systems'

# Pattern to match relative imports
patterns = [
    (r"from '\.\./core/EventBus\.js'", "from '/docs/js/core/EventBus.js'"),
    (r"from '\.\./core/StateManager\.js'", "from '/docs/js/core/StateManager.js'"),
    (r"from '\./proceduralPlanetRenderer\.js'", "from '/docs/js/systems/proceduralPlanetRenderer.js'"),
    (r"from '\.\./data/gameData\.js'", "from '/docs/js/data/gameData.js'"),
]

# Process each .js file in the systems directory
for filename in os.listdir(systems_dir):
    if filename.endswith('.js'):
        filepath = os.path.join(systems_dir, filename)
        
        # Read the file
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Check if file needs fixing
        original_content = content
        for pattern, replacement in patterns:
            content = re.sub(pattern, replacement, content)
        
        # If content changed, write it back
        if content != original_content:
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"Fixed imports in {filename}")
        else:
            print(f"No changes needed in {filename}")

print("Import fix complete!")

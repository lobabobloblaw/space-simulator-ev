#!/usr/bin/env python3
"""
Create favicon.ico and favicon.png for Galaxy Trader
Simple spaceship design with transparency
"""

from PIL import Image, ImageDraw

def create_spaceship_icon(size):
    """Create a spaceship icon at the specified size"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Scale factor for drawing
    scale = size / 16
    
    def s(val):
        """Scale a value"""
        return int(val * scale)
    
    # Engine glow (subtle)
    if size >= 32:
        glow_color = (0, 255, 255, 40)
        draw.ellipse([s(5), s(9), s(11), s(15)], fill=glow_color)
    
    # Main ship body (triangle)
    ship_points = [
        (s(8), s(2)),   # Top point
        (s(4), s(12)),  # Bottom left
        (s(8), s(10)),  # Center indent
        (s(12), s(12)), # Bottom right
    ]
    draw.polygon(ship_points, fill=(224, 224, 224, 255))
    
    # Ship highlight (top section)
    highlight_points = [
        (s(8), s(2)),
        (s(6), s(8)),
        (s(8), s(7)),
        (s(10), s(8)),
    ]
    draw.polygon(highlight_points, fill=(255, 255, 255, 255))
    
    # Cockpit window
    draw.rectangle([s(7), s(5), s(9), s(7)], fill=(0, 51, 102, 255))
    
    # Engine flame (cyan)
    draw.rectangle([s(7), s(11), s(9), s(13)], fill=(0, 255, 255, 255))
    
    # Engine side flames
    if size >= 16:
        draw.rectangle([s(6), s(12), s(7), s(14)], fill=(0, 255, 255, 170))
        draw.rectangle([s(9), s(12), s(10), s(14)], fill=(0, 255, 255, 170))
    
    # Wing lights (port red, starboard green)
    if size >= 16:
        draw.rectangle([s(4), s(10), s(5), s(11)], fill=(255, 0, 0, 255))
        draw.rectangle([s(11), s(10), s(12), s(11)], fill=(0, 255, 0, 255))
    
    return img

# Create icons at different sizes
icon_16 = create_spaceship_icon(16)
icon_32 = create_spaceship_icon(32)
icon_48 = create_spaceship_icon(48)
icon_64 = create_spaceship_icon(64)

# Save as PNG (for web use)
icon_32.save('/Users/alexvoigt/Documents/Claude/space-simulator-ev/docs/favicon.png', 'PNG')
print("Created favicon.png (32x32)")

# Create ICO file with multiple resolutions
icon_16.save('/Users/alexvoigt/Documents/Claude/space-simulator-ev/docs/favicon.ico', 
             format='ICO', 
             sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
print("Created favicon.ico (multi-resolution)")

# Also save individual sizes for reference
icon_16.save('/Users/alexvoigt/Documents/Claude/space-simulator-ev/docs/favicon-16.png', 'PNG')
icon_64.save('/Users/alexvoigt/Documents/Claude/space-simulator-ev/docs/favicon-64.png', 'PNG')
print("Created additional PNG sizes for reference")

print("\nTo use in your HTML, add these lines to <head>:")
print('  <link rel="icon" type="image/x-icon" href="favicon.ico">')
print('  <link rel="icon" type="image/png" href="favicon.png">')

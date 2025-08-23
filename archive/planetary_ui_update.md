# Planetary UI Landscape Display Update

## Problem
- Planet landscape images had thin black bars on left/right sides
- Images weren't using the full width of their container
- Would look better if images filled the entire section

## Solution
1. **Removed container padding** - Now uses full 420px width
2. **Updated canvas dimensions** - Changed from 400x450 to 420x472 (maintains 8:9 ratio)
3. **Image fills entire canvas** - No more letterboxing, image scales to fill
4. **Overflow clipping** - If UI resizes, image stays fixed size and clips edges

## Changes Made
- `index.html`: Canvas now 420x472 pixels
- `main.css`: Container has no padding, overflow hidden
- `allSystems.js`: AI images generate at 420x472, draw to fill canvas

## Result
- Landscape images now edge-to-edge in their section
- No black bars on sides
- Cleaner, more immersive appearance
- Images maintain quality with crisp-edges rendering
- Responsive design still works at smaller breakpoints

## Testing
1. Fly to any planet and press L to land
2. Landscape should fill the left section completely
3. Try resizing window - image should stay fixed and clip if needed

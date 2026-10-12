# Var2JSON By Nykaa

Export LUMI Variables to JSON — a Figma plugin that reads local variable collections and exports them as structured design tokens.

## Installation (Local Development)

1. **Install dependencies and build:**

```bash
npm install
npm run build
```

2. **Load in Figma:**
   - Open Figma Desktop
   - Go to **Plugins → Development → Import plugin from manifest...**
   - Select the `manifest.json` file in this directory
   - The plugin appears under **Plugins → Development → Var2JSON By Nykaa**

3. **Run the plugin:**
   - Open a Figma file that has local variable collections
   - Go to **Plugins → Development → Var2JSON By Nykaa**

## Development

```bash
# Watch mode — rebuilds on file changes
npm run watch

# Type check
npm run typecheck

# Run tests
npm test
```

## Token Type Mapping

| Token path pattern | Export type |
|---|---|
| `color/*`, `colour/*` | `"color"` |
| `spacing/*`, `gap/*`, `padding/*`, `margin/*` | `"spacing"` |
| `cornerRadius/*`, `borderRadius/*`, `radius/*` | `"spacing"` |
| `size/*`, `sizing/*` | `"sizing"` |
| `typography/fontSize/*`, `fontSize/*` | `"fontSize"` |
| `typography/fontFamily/*`, `fontFamily/*` | `"fontFamily"` |
| `typography/fontWeight/*`, `fontWeight/*` | `"fontWeight"` |
| `typography/lineHeight/*`, `lineHeight/*` | `"lineHeight"` |
| `typography/letterSpacing/*`, `letterSpacing/*` | `"letterSpacing"` |
| `borderWidth/*`, `strokeWidth/*` | `"borderWidth"` |
| `opacity/*` | `"opacity"` |
| `duration/*`, `motion/duration/*` | `"duration"` |

Aliases are preserved as `{dot.separated.references}` and use the originating token's type.

## Output Format

```json
{
  "cornerRadius": {
    "brand": {
      "value": "{size.200}",
      "type": "spacing"
    }
  }
}
```

Stable key ordering, two-space indentation, trailing newline. Copy and Download produce identical output.

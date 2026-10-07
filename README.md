# Book Builder

A lightweight browser-based manuscript editor for creating print-ready books with compact side notes.

## What it does

- Create, rename, reorder, and delete chapters
- Edit chapter text in structured blocks
- Insert compact side-note callouts that sit beside the story in print
- Edit title, subtitle, author, trim size, margins, typography, and paragraph spacing
- Live 6×9-style print preview
- Autosave locally in the browser
- Export/import the manuscript as JSON
- Export the book as PDF through the browser's print dialog

## Run it

This project is intentionally dependency-free.

1. Open `index.html` directly in a modern browser, or
2. Serve the folder with any static server.

For example:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## PDF export

Click **Export PDF**. In the browser print dialog:

- Destination: **Save as PDF**
- Paper size: use the book's selected trim size when supported, or choose a custom paper size
- Margins: **None** (the app supplies print margins)
- Scale: **100%**
- Headers and footers: **Off**
- Background graphics: **On**

The print stylesheet uses the selected trim size and print-safe margins.

## Data

The app autosaves to `localStorage`. Use **Export Project** to download a JSON backup and **Import Project** to restore it.

## Current focus

This first version is optimized for narrative books such as *The Ones I'll Never Forget*: normal story text with occasional compact side-note boxes, rather than a permanent sidebar.

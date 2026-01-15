# TODO - PDFPW Features to Implement

This document lists missing features compared to pdfpc (PDF Presenter Console) and other enhancements for the web-based version.

## Core Navigation Features (High Priority)

### Slide Navigation
- [x] **Skip multiple slides** - Move forward/backward by 10 slides (Shift + arrows)
- [x] **User slide navigation** - Navigate by user slides (overlays), not just PDF pages (Up/Down arrows)
- [x] **Jump to first/last slide** - Home/End key support
- [x] **Go to slide number** - Input slide number to jump directly (g key)
- [x] **History navigation** - Backspace to return to previous jump position

### Presenter Tools
- [x] **Overview mode** - Grid view of all slides for quick navigation (Tab key)
- [ ] **Note editing** - Edit notes during presentation (n key), save to .pdfpc file
- [x] **Timer reset** - Reset timer functionality (r key)

## Configuration & Customization

### Key Bindings
- [ ] **Custom key bindings** - Allow users to customize keyboard shortcuts via config file
- [ ] **Key binding UI** - GUI to view and customize key bindings
- [ ] **Mouse button bindings** - Customize mouse button actions

### Display Options
- [ ] **Presenter layout options** - Adjust current slide size percentage (default 60%)
- [ ] **Overview thumbnail size** - Configure minimum width for overview thumbnails
- [ ] **Switch displays** - Option to swap presenter/presentation screen positions

## PDF Viewer Enhancements

### Overlay System
- [ ] **Overlay previews** - Show next/previous overlay step in small previews below main slide
- [ ] **Manual overlay marking** - Mark slides as overlay steps (o key in pdfpc)

### Caching & Performance
- [ ] **Cache progress indicator** - Visual progress bar showing prerendering status
- [ ] **Disable cache option** - Option to disable prerendering for low-memory devices
- [ ] **Cache compression** - Compress cached slides in memory (relevant for large PDFs)

## Web-Native Features (Potential Enhancements)

### Remote Control
- [ ] **Remote presentation mode** - URL-based connection for audience devices
- [ ] **QR code generation** - Easy way to connect presentation window
- [ ] **Mobile presenter view** - Optimized presenter view for mobile devices

### Annotations & Drawing
- [ ] **Laser pointer** - Mouse highlight/laser pointer on presentation screen
- [ ] **Drawing tools** - Draw on slides (pen, highlighter, shapes)
- [ ] **Whiteboard mode** - Blank canvas for drawing
- [ ] **Annotation persistence** - Save annotations across sessions

### Collaboration
- [ ] **Shared notes** - Real-time notes for connected viewers
- [ ] **Q&A mode** - Audience can submit questions during presentation
- [ ] **Live polling** - Interactive polls/quizzes

### Display Enhancements
- [ ] **Video export** - Record presentation to video
- [ ] **Custom themes** - Dark/light mode, custom color schemes
- [ ] **PDF metadata display** - Show author, title, creation date
- [ ] **Slide thumbnails in presenter view** - Thumbnail strip for navigation

### Advanced Features
- [ ] **Presentation recording** - Record slide timing and annotations
- [ ] **Presenter switcher** - Multiple presenters hand-off feature
- [ ] **Break timer** - Countdown timer for breaks
- [ ] **Presentation notes export** - Export notes to markdown/text

## Technical Improvements

### Configuration Files
- [ ] **.pdfpcrc support** - Read global and user config files for key bindings
- [ ] **Config import/export** - GUI for managing settings
- [ ] **Profile management** - Save different configurations for different scenarios

### File Handling
- [ ] **Drag & drop PDF** - Direct PDF file drop to open
- [ ] **Recent files UI** - Visual recent files picker
- [ ] **Auto-open last file** - Option to resume last presentation
- [ ] **PDF from URL** - Load PDF from URL (with CORS proxy)

### Accessibility
- [ ] **Screen reader support** - ARIA labels and announcements
- [ ] **Keyboard-only navigation** - Full keyboard accessibility
- [ ] **High contrast mode** - For visually impaired users
- [ ] **Font size scaling** - Global UI scaling options

## Bug Fixes & Polish

### Stability
- [ ] **Connection recovery** - Auto-reconnect if broadcast channel disconnects
- [ ] **Error boundaries** - Better error handling and recovery
- [ ] **Memory leak prevention** - Proper cleanup of cached slides

### User Experience
- [ ] **Loading indicators** - Better visual feedback during PDF loading
- [ ] **Keyboard shortcuts help** - In-app keyboard shortcut reference
- [ ] **First-run tutorial** - Guide for new users
- [ ] **Offline support** - Service worker for offline usage

## References

- [pdfpc official site](https://pdfpc.github.io/)
- [pdfpc GitHub](https://github.com/pdfpc/pdfpc)
- [pdfpc man page](https://davvil.github.io/pdfpc/manpage.html)

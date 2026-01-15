#import "@preview/touying:0.5.3": *
#import themes.metropolis: *

#show: metropolis-theme.with(
  aspect-ratio: "16-9",
  config-info(
    title: [PDFPW Demo],
    subtitle: [Browser-based PDF Presenter Console],
    author: [Adapted from pdfpc demo],
    date: datetime.today(),
  ),
)

#title-slide()

= Introduction

== Starting up

Hi! Welcome to the demo of PDFPW, a browser-based PDF presentation tool.

*Setting up*
- Open the presenter console first
- Then open the presentation window from the link
- Both windows will synchronize automatically via Broadcast Channel API

#pause

Let's get started!

== The presenter view

The presenter console is on your monitor, visible only to you.

- Current slide with zoom capability
- Next slide preview
- Presentation timer with controls
- Current slide number and total slides
- Presenter notes (if configured)
- Overview mode for navigation

#pause

The presentation window only shows the current slide to your audience.

= Navigation

== Basic movement

*Forward navigation:*
- Arrow keys: `→`, `↓`
- Page: `Page Down`
- `Enter`/`Return`, `Space`

#pause

*Backward navigation:*
- Arrow keys: `←`, `↑`
- Page: `Page Up`
- `Backspace`

#pause

*Fast navigation:*
- Press `Shift` + `←`/`→` to skip 10 slides

== Overlays

Some people like overlays in their presentations

- i.e. slides that build up step-by-step #pause
- PDFPW supports such overlays #pause
- The slide counter shows the overlay step #pause
- Too long overlays may be boring for the audience #pause
- Use them wisely!

== User slide navigation

- Press `↓` to jump to the next user slide (overlay group) #pause
- Press `↑` to jump to the previous user slide #pause
- This skips overlay steps within a slide #pause
- Useful for quick navigation between topics

== Jumping to specific slides

- Press `G`, then type a slide number, then press `Enter` to jump #pause
- Press `Home` to jump to the first slide #pause
- Press `End` to jump to the last slide #pause
- Press `Backspace` to return to the previous position #pause
- Press `Tab` to open the overview dialog #pause

#pause

This makes navigation flexible and efficient.

= Features

== Overview mode

- Press `Tab` or click the "一覧表示" button #pause
- See all slides in a grid layout #pause
- Click any slide to jump directly to it #pause
- Press `Esc` or click outside to close #pause
- Perfect for quick navigation during Q&A

== Notes

Notes can be shown in the presenter console.

- Notes are defined via external `.pdfpc` configuration files
- Notes are automatically loaded when available
- Notes apply to slides in an overlay group

== Controlling the presentation view

- *Freeze* the presentation view #pause
  - Useful when searching for slides without confusing the audience
  - Click "投影固定" button to toggle
- *Fade to black* the presentation view #pause
  - Useful when switching between slides and blackboard
  - Click "投影停止" button to toggle
- Status indicators show the current state

== Controlling the timer

- Timer starts automatically when you navigate to slide 2+ #pause
- Click the play/pause button to control the timer #pause
- Press `R` to reset the timer #pause
- Timer shows remaining time or elapsed time based on configuration #pause
- Current time is always displayed below the timer

== Freezing the presentation

When the presentation is frozen:

- The presentation window stops updating #pause
- You can navigate slides on your console without the audience seeing #pause
- Perfect for previewing upcoming slides or finding specific content #pause
- Click "投影固定" again to unfreeze

== Blackout mode

When blackout is enabled:

- The presentation window goes black #pause
- Useful for redirecting attention or during breaks #pause
- The timer continues running #pause
- Click "投影停止" again to disable

= Interface

== Controls overview

All features are accessible via the presenter console:

- Mode buttons at the top (Freeze, Blackout, Overview)
- Timer in the bottom center
- Navigation buttons on the left and right
- Notes panel on the right side

#pause

Intuitive and mouse-friendly interface!

== Keyboard shortcuts summary

*Navigation:*
- `←`/`→`: Previous/next overlay step
- `↑`/`↓`: Previous/next user slide
- `Shift + ←`/`→`: Skip 10 slides
- `Home`/`End`: First/last slide
- `G` + number + `Enter`: Jump to slide
- `Backspace`: Return to previous position
- `Tab`: Toggle overview mode

*Controls:*
- `R`: Reset timer
- `Space`: Pause/resume timer
- `F`: Toggle fullscreen (presentation window)

== Configuration

Additional presentation information is supported:

- Duration settings for countdown timer #pause
- Presenter notes per slide #pause
- Custom slide labels #pause
- Configuration via `.pdfpc` files (compatible with pdfpc format) #pause
- JSON-based format, easy to edit

= Technical

== Technical details

PDFPW is a modern, web-based presentation tool:

- Runs entirely in your browser #pause
- No server backend required #pause
- Uses Broadcast Channel API for window synchronization #pause
- Supports modern browsers with File System Access API #pause
- PDF.js for reliable PDF rendering #pause
- Progressive enhancement with graceful fallbacks

== Compatibility

PDFPW respects the PDF presentation ecosystem:

- Compatible with `.pdfpc` configuration files #pause
- Supports the same overlay notation as pdfpc #pause
- Works with PDFs generated from LaTeX (Beamer), Typst (Touying), and other tools #pause
- Leverages existing PDF presentation ecosystem

= Conclusion

== Finishing

- Support slides after your "last" slide #pause
  - Advanced topics, bibliography, Q&A, etc.
- The slide count helps you track progress
- Easy navigation to any slide via overview mode

--- #align(center)[#text(size: 36pt, weight: "bold")[*THE END*]]

#v(1em)
#align(center)[*There may be additional slides with extra information,*]
#align(center)[*available on demand if the audience asks*]

= Appendix

== Acknowledgements

- This demo is adapted from the pdfpc demo
- pdfpc was a fork of pdf-presenter-console
- Many thanks to the original authors and contributors
- Built with modern web technologies

---

Thank you for trying PDFPW!

For more information, visit the project repository.

#show: appendix

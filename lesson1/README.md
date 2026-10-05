# CS + SG Production Team: Interactive Web Development Lesson

## Project Goal

Build a web-based presentation and interactive lesson for the CS + SG
Education Team.

This is **not** meant to be a traditional slide deck. The website should
function as the presentation, teaching interface, interactive demo
environment, and eventually the guided workspace for the students'
hands-on exercises.

The audience is students who will likely arrive with basic Python
knowledge. We can assume they understand foundational computer concepts
such as the difference between a file and a folder. We should **not**
assume that they understand web development, browser rendering, the CLI,
Git internals, branching, remotes, or production-team workflows.

The overall goal is to prepare students to become useful contributors on
a production team.

The lesson should prioritize understanding over memorization.

------------------------------------------------------------------------

## Core Teaching Philosophy

Teach each major concept from the ground up.

Do not start by throwing commands or syntax at students and telling them
what they do. First establish the underlying mental model, then
introduce the syntax/tool, then work through a problem, and finally have
the students use it themselves.

The intended pattern is:

1.  What problem does this solve?
2.  What is actually happening underneath?
3.  What does the relevant syntax/tool represent?
4.  Walk through an example.
5.  Give students a small problem to reason through.
6.  Let students actually use it.

The presentation should therefore feel more like an interactive
technical workshop than a slideshow.

Avoid excessive abstraction. Students should leave understanding why the
tools work, not just having copied commands.

------------------------------------------------------------------------

# Lesson Structure

The class is approximately 2 hours.

The exact timing should be represented clearly in the website so the
instructor can move through the lesson as a sequence of timed sections.

A tentative structure:

1.  Introduction / What are we building?
2.  How the Web Works / What is frontend?
3.  HTML from the ground up
4.  Browser rendering and the DOM
5.  HTML hands-on work
6.  CLI fundamentals
7.  Git from the ground up
8.  Branches, commits, and history
9.  Remotes and GitHub
10. Git problem-solving exercises
11. Production workflow
12. Final hands-on assignment / production simulation
13. Wrap-up

The exact section names and timing can change during implementation, but
the site should make it easy to reorganize them.

------------------------------------------------------------------------

# Section 1: Introduction

Establish the actual objective of the lesson.

The students are not simply learning HTML.

They are learning enough of the basic web development and
version-control workflow to begin contributing to a production team.

Frame the lesson around a realistic scenario:

> You just joined a production team. You are given a repository, asked
> to make a change, and expected to get that change reviewed and merged
> without breaking everyone else's work.

The final workflow should eventually look approximately like:

``` text
Understand the existing project
        ↓
Create a branch
        ↓
Make a change
        ↓
Test / inspect the change
        ↓
Review your diff
        ↓
Commit
        ↓
Push
        ↓
Open a Pull Request
        ↓
Review
        ↓
Merge
```

------------------------------------------------------------------------

# Section 2: What Is Frontend?

Use the old CS + SG HTML lesson as a content reference.

The previous lesson introduced the question:

> What the hell is a frontend?

It then described HTML as the language used to add, describe, and
structure the contents of a webpage, and positioned HTML as the skeleton
that works with CSS and JavaScript.

Retain that general framing, but expand it conceptually.

Students should understand the rough distinction between:

-   HTML: structure and meaning
-   CSS: presentation and styling
-   JavaScript: behavior and interaction

Do not spend excessive time on CSS or JavaScript because they are not
the main focus of this lesson.

------------------------------------------------------------------------

# Section 3: HTML From the Ground Up

This section should go deeper than simply explaining tags.

Start with the question:

> What actually happens when you type a URL into a browser and load a
> webpage?

Build a simplified mental model of:

``` text
HTML source
    ↓
Browser receives/parses HTML
    ↓
HTML becomes a structured document
    ↓
Browser determines what elements exist and how they are nested
    ↓
Browser renders the document
```

Introduce the idea that browsers parse HTML rather than simply
displaying the raw source text.

The exact implementation details do not need to become a
browser-engineering lecture, but students should understand that HTML is
interpreted by the browser according to a defined structure.

Introduce the DOM as a useful mental model.

For example:

``` html
<body>
    <h1>Hello</h1>
    <p>Welcome!</p>
</body>
```

can be represented conceptually as:

``` text
body
├── h1
│   └── "Hello"
└── p
    └── "Welcome!"
```

The interactive website should make this relationship visual where
possible.

------------------------------------------------------------------------

# HTML Concepts

Cover the fundamentals from the previous CS + SG lesson, but organize
them around understanding rather than a long list of tags.

Important concepts:

-   HTML documents
-   Elements
-   Opening and closing tags
-   Nesting
-   Attributes
-   `html`
-   `head`
-   `body`
-   `title`
-   headings
-   paragraphs
-   links
-   images
-   lists
-   semantic elements
-   relative paths
-   external URLs

The old lesson specifically covered common elements, attributes, links,
images, file paths, lists, grouping, and semantic versus structural
HTML. Use it as the baseline rather than silently replacing its
terminology.

Source reference: `HTML Slides.pdf`

------------------------------------------------------------------------

# Interactive HTML Demo

The presentation should include a live HTML playground.

The interface should ideally have:

``` text
┌─────────────────────────┬─────────────────────────┐
│ HTML SOURCE             │ BROWSER PREVIEW         │
│                         │                         │
│ <h1>Hello</h1>          │ Hello                   │
│ <p>World</p>            │ World                   │
│                         │                         │
└─────────────────────────┴─────────────────────────┘
```

Students should be able to modify HTML and immediately see the result.

The purpose is not to build a full online code editor. It is to visually
demonstrate the relationship between source HTML and rendered output.

If feasible, add an optional DOM/tree visualization.

------------------------------------------------------------------------

# caniuse.com

The lesson must introduce students to `caniuse.com`.

The purpose is to teach them that web development is not just about
knowing syntax.

Developers need to ask:

> Does this feature actually work in the browsers/devices we care about?

Show how to use Can I Use to investigate browser support for a web
feature.

The lesson should include at least one concrete example where students
inspect browser compatibility.

Do not turn this into a comprehensive browser compatibility lecture.

The desired takeaway is:

> When you encounter a web feature you do not know, check its
> documentation and browser support instead of guessing.

------------------------------------------------------------------------

# Section 4: CLI

The CLI should be introduced because students will use it for the actual
workflow.

Assume students already understand files and folders.

Do not waste time explaining what a directory is.

Teach the mental model:

> A terminal is another interface for interacting with the computer.
> Instead of clicking through a GUI, you give the shell commands.

Introduce only the commands necessary for the lesson initially.

Likely commands:

``` bash
pwd
ls
cd
mkdir
touch
```

Potentially later:

``` bash
cat
```

The lesson should emphasize understanding the current working directory.

Students should actually create their project using the CLI.

Example:

``` bash
mkdir cs-sg-site
cd cs-sg-site
touch index.html
```

Then inspect the result.

The CLI should not be treated as a separate unrelated lecture. It should
be introduced because it is the natural interface they will use for the
development workflow.

------------------------------------------------------------------------

# Section 5: Git From the Ground Up

Git deserves more depth than a typical introductory workshop.

Do not reduce Git to:

``` text
git add
git commit
git push
```

Students should understand what Git is solving.

Start with the problem:

> Multiple people need to change the same codebase over time. We need a
> reliable history of changes and a way to work without constantly
> overwriting each other.

Then build the mental model.

Students should understand the distinction between:

-   Working directory
-   Staging area
-   Commit
-   Repository
-   Local repository
-   Remote repository

A visual representation should show:

``` text
Working Directory
       │
       │ git add
       ↓
Staging Area
       │
       │ git commit
       ↓
Local Repository
       │
       │ git push
       ↓
Remote Repository
```

The website should make these transitions visually interactive if
possible.

------------------------------------------------------------------------

# Git History

Explain that commits are snapshots in Git's history rather than simply
"saving the file."

Show a simplified commit graph.

For example:

``` text
A --- B --- C
```

Explain that each commit represents a point in project history.

Then show branching:

``` text
A --- B --- C
           \
            D --- E
```

Explain that a branch is essentially a movable reference to a line of
development.

Do not oversimplify branching into "making a copy of the project."

Students should understand the conceptual difference.

------------------------------------------------------------------------

# Branches

Go somewhat deeper here.

Explain:

-   Why branches exist
-   What `main` represents
-   Creating a branch
-   Switching branches
-   Making commits on a branch
-   Why different people can work on different branches
-   How branches eventually get merged

Relevant commands can include:

``` bash
git branch
git switch -c feature-name
git switch main
```

The exact command set can be adjusted based on what the team actually
uses.

Show the commit graph changing as students switch branches and create
commits.

------------------------------------------------------------------------

# Remotes

Explicitly teach the idea that a remote is not "GitHub."

A remote is a Git repository location known to your local repository.

GitHub is one service that can host remote repositories.

Students should understand:

``` text
Local repository
        │
        │ knows about
        ↓
Remote
        │
        ↓
GitHub repository
```

Introduce concepts such as:

-   `origin`
-   remote URL
-   `git remote`
-   push
-   pull

Do not assume that students understand why `origin` exists.

Explain that `origin` is simply the conventional name given to a remote.

Potential commands:

``` bash
git remote -v
git remote add origin <url>
git push -u origin main
```

The website should distinguish clearly between:

``` text
Git
GitHub
Local repository
Remote repository
```

These should never be presented as interchangeable concepts.

------------------------------------------------------------------------

# Git Problems

Before students immediately start following commands, give them one or
two conceptual problems.

Examples:

### Problem 1

You have:

``` text
main:    A --- B
               \
feature:        C --- D
```

Ask:

-   Which commits exist on `main`?
-   Which commits exist only on `feature`?
-   What happens if you switch back to `main`?
-   What happens when the feature branch is merged?

### Problem 2

A student edits a file and says:

> "I committed it, so why doesn't GitHub show my change?"

Have students reason through the distinction between:

``` text
edit
→ stage
→ commit
→ push
```

The answer should force them to understand that a local commit does not
automatically become a remote commit.

The exact problems can be refined during implementation.

------------------------------------------------------------------------

# Production Workflow

Once students understand Git concepts, introduce the actual team
workflow.

Students should understand that production development is not normally:

``` text
edit main
→ push main
```

Instead, something closer to:

``` text
main
  ↓
create feature branch
  ↓
make changes
  ↓
test
  ↓
review diff
  ↓
commit
  ↓
push branch
  ↓
Pull Request
  ↓
review
  ↓
merge
```

Explain why this workflow exists.

Connect every step back to the earlier Git concepts.

------------------------------------------------------------------------

# Hands-On Assignment

The final activity should simulate a real production task.

Suggested assignment:

> Add yourself to the CS + SG production team webpage.

Students should:

1.  Clone or otherwise obtain the project.
2.  Inspect the project.
3.  Create a feature branch.
4.  Modify the HTML.
5.  Preview/test the result.
6.  Inspect their changes with Git.
7.  Commit their changes.
8.  Push the branch.
9.  Open a Pull Request.
10. Review or receive review.
11. Merge the change.

The exact repository and workflow will be supplied during
implementation.

The assignment should be designed so that students cannot complete it
purely by copying commands from the presentation. They need to
understand enough to solve small problems themselves.

------------------------------------------------------------------------

# Interactive Presentation Design

The website should not look like a normal PowerPoint replacement.

It should feel like an interactive technical workshop.

Possible components:

### 1. Slide / section navigation

Keyboard navigation should work.

Suggested controls:

-   Arrow keys
-   Space
-   Click navigation
-   Progress indicator

### 2. Live code examples

Syntax-highlighted HTML, shell, and Git commands.

### 3. Interactive HTML playground

Editable HTML with live browser-style preview.

### 4. Terminal simulation

A lightweight simulated terminal for demonstrating CLI commands.

This does not need to execute arbitrary shell commands.

It can provide controlled demonstrations such as:

``` text
$ pwd
/home/student/cs-sg-site

$ ls
index.html
```

### 5. Git graph visualization

Interactive commits and branches.

Students should be able to see how commands alter the graph.

### 6. Checkpoint questions

Short questions throughout the lesson.

Examples:

> You edited a file and ran `git commit`. Can another developer on
> GitHub see your change yet?

Possible answers:

-   Yes
-   No
-   Only if you push

Then reveal the reasoning.

### 7. Instructor controls

If feasible, provide a way to jump directly to sections.

The instructor should not be forced to follow a completely linear
presentation.

------------------------------------------------------------------------

# Visual Design

The website should feel like a modern developer tool rather than a
corporate slideshow.

Priorities:

-   High readability
-   Large code examples
-   Strong visual hierarchy
-   Dark-mode-first is reasonable
-   Minimal decorative clutter
-   Smooth but restrained transitions
-   Clear distinction between explanation, code, question, and hands-on
    activity

Do not over-animate.

Do not make the UI so visually elaborate that it distracts from the
technical content.

------------------------------------------------------------------------

# Technical Requirements

The implementation should be simple enough for the CS + SG team to
maintain.

Prefer:

-   HTML
-   CSS
-   JavaScript

A framework can be used if there is a strong reason, but the project
should not require a complicated backend just to present the lesson.

The website should run locally with minimal setup.

If a development server is needed, document the exact command in the
README.

The final site should ideally be deployable as a static site.

------------------------------------------------------------------------

# Important Content Boundaries

Do NOT try to teach all of web development.

Do NOT spend significant time on:

-   Advanced CSS
-   JavaScript programming
-   Backend development
-   Frameworks
-   React
-   Databases
-   Authentication
-   Advanced Git internals
-   Rebasing
-   Complex merge conflicts

These can be future lessons.

The goal is a strong conceptual foundation for HTML, the CLI, Git,
GitHub, and basic production workflow.

------------------------------------------------------------------------

# Source Material

The uploaded file:

`HTML Slides.pdf`

is the primary reference for the existing CS + SG HTML lesson.

Its existing structure includes:

-   HTML basics
-   HTML tags
-   common HTML elements
-   HTML document breakdown
-   links
-   images
-   file paths
-   attributes
-   lists
-   grouping and inline elements
-   semantic versus structural HTML
-   SEO
-   recap
-   a first assignment

The new lesson should preserve useful terminology and concepts from this
material while reorganizing them around the new production-oriented
lesson structure.

The old deck should be treated as source material, not as a requirement
to reproduce the same number of slides.

------------------------------------------------------------------------

# Current Status

This README began as the initial specification. The implementation below
now uses Minesweeper as the shared project and keeps detailed explanations
in instructor notes so the projected slides can stay concise.

------------------------------------------------------------------------

## Running the workshop locally

The presentation is a static site with no install step or build process.
From this folder, start a local server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000> in a browser. The top tabs switch
between the student Assignment and instructor Slides. In Slides, use the
section list, arrow buttons, or left/right arrow keys to navigate. Select
Present for full-screen mode; press Escape to exit. Arrow keys move between
slides. The teacher Minesweeper demo is also available at
<http://localhost:8000/minesweeper.html>.

The Slides stay on the frontend and walk the class through coding the game:
agree on a shared implementation, create HTML and CSS, model the board,
calculate neighbors, render cells, handle reveals, finish the round, and
playtest. Instructor notes carry the longer explanations. The Assignment
tab provides about 60 minutes of pair coding. Slide talk/demo timings total
about 59 minutes. Networking and backend development are reserved for a later class.

The old `HTML Slides.pdf` source reference is not present in the project
folder. The workshop content remains editable in `index.html` slide
templates and `deck.js`; the playable frontend is in `minesweeper.html`,
`minesweeper.css`, and `minesweeper.js`. The shared classroom rules and
data model are recorded in `IMPLEMENTATION.md`.

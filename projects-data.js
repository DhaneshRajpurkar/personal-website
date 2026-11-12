/* =====================================================================================================
   YOUR PROJECTS: edit this file to update the website. No other file needs to change.

   Every project gets:
     • a CARD on the Projects page (title, label, summary, tools), and
     • its own ARTICLE PAGE at  project.html?p=<id>  — the full story, with paragraphs, lists and pictures.
       Link straight to it from your resume or LinkedIn, e.g.
       https://dhaneshr.com/project.html?p=transponder

   ADD A PROJECT (about 5 minutes)
     1. Make a folder for its pictures:  media/projects/<id>/        (e.g. media/projects/solar-tracker/)
        <id> = the project's short name: lowercase, words joined by dashes.
     2. Copy the TEMPLATE below (everything from  {  to  },  ) and paste it into the PROJECTS list further down.
        Order here = order on the Projects page (best work first).
     3. Fill it in. Delete any optional line you don't need.
     4. Save and refresh projects.html. If something's wrong, a red box on the page names the project and field.
     On GitHub: upload the photos into the folder (Add file → Upload files), then open this file → ✏️ → edit →
     "Commit changes". The site updates in about a minute.

   RULES THAT TRIP PEOPLE UP
     • Every piece of text goes inside quotes: "like this". If your text contains a " use \" instead.
     • Every { ... } block ends with a comma:  },     Every item in a [ list ] is followed by a comma too.
     • Several paragraphs = a list of strings:  text: ["First paragraph.", "Second paragraph."]
     • Pictures: .jpg / .png / .webp / .svg, lowercase names without spaces (pcb-rev-b.jpg).
       Keep photos under ~500 KB (export about 1600 px wide) so pages load fast.

   WRITING TIPS (what employers skim for)
     • Lead with the problem, then what YOU did, then the result (numbers if you have them).
     • A "Challenges" section — what broke and how you fixed it — is the most convincing part of any write-up.
     • One picture per section beats a gallery nobody scrolls: a diagram, a photo of the build, a test result.

   TEMPLATE (copy me) ─────────────────────────────────────────────────────────────────────────────────
  {
    id:      "my-project",                                     // short name used in the page address + photo folder
    title:   "Project name",                                   // required
    kind:    "Embedded · Robotics",                            // required: small label above the title
    summary: "One or two sentences: what it is and why it matters.",   // required (card + top of the article)
    role:    "What YOU did on it.",                            // optional
    tags:    ["hardware"],                                     // required: "hardware", "software", "ai" (new tags = new filters)
    tools:   ["KiCad", "Fusion 360"],                          // optional: tools / parts / languages
    status:  "In progress",                                    // optional: "In progress", "Complete", "Prototype"…
    year:    "2026",                                           // optional
    team:    "Me + 3 classmates",                              // optional
    dates:   "Aug – Dec 2026",                                 // optional
    image:   "media/projects/my-project/cover.jpg",            // optional: cover photo (card + top of the article)
    imageAlt:"What the photo shows",
    links: [                                                   // optional: buttons
      { label: "GitHub", url: "https://github.com/DhaneshRajpurkar/repo" },
    ],
    sections: [                                                // the article, top to bottom. Any headings you like.
      { heading: "The problem",
        text: "What needed solving, and for whom." },
      { heading: "What I built",
        text: ["First paragraph.", "Second paragraph."],
        image: { src: "media/projects/my-project/diagram.png", caption: "How the parts connect" } },   // one picture
      { heading: "How it works",
        text: "A short intro to the list:",
        bullets: ["Sensor reads X", "Microcontroller does Y", "App shows Z"] },
      { heading: "Challenges",
        text: "What went wrong and how you fixed it.",
        images: [                                              // 2 or 3 pictures side by side
          { src: "media/projects/my-project/before.jpg", caption: "Rev A: it overheated" },
          { src: "media/projects/my-project/after.jpg",  caption: "Rev B: moved the regulator" },
        ] },
      { heading: "Results",
        text: "Numbers if you have them: battery life, accuracy, placement, users.",
        quote: "Optional: a line from a judge, user or teammate." },
    ],
    gallery: [ { src: "media/projects/my-project/extra.jpg", caption: "More photos at the end" } ],  // optional
    video:   "https://www.youtube.com/watch?v=XXXXXXXXXXX",    // optional: a YouTube link plays on the page
  },
   ───────────────────────────────────────────────────────────────────────────────────────────────── */

window.PROJECTS = [
  {
    id:      "thresher-shark-tag",
    title:   "Thresher Shark Tag",
    kind:    "Embedded · Marine tracking",
    summary: "A tracking tag for thresher sharks, built with my brother. Custom PCB, enclosure CAD, and firmware maintained in one repository.",
    role:    "PCB design review and revisions, enclosure CAD, code.",
    tags:    ["hardware"],
    tools:   ["KiCad", "PCB", "CAD"],
    status:  "In progress",
    team:    "Me + my brother",
    links:   [ /* { label: "GitHub", url: "https://github.com/..." }, */ ],
    sections: [
      { heading: "The idea",
        text: "Thresher sharks spend most of their lives far from where people can watch them. A tag that rides along with the animal is one of the few ways to learn where it actually goes. My brother and I set out to build our own: the circuit board, the housing that protects it, and the code that runs it." },
      { heading: "How we split the work",
        text: ["My brother leads the PCB design. My job on the board is reviewing his layouts and making revisions, a second pair of eyes before anything gets made. I also work on the enclosure CAD and on the code.",
               "We keep the board files, the enclosure model and the firmware together in one GitHub repository, so a change to one part is easy to check against the other two."],
        image: { src: "media/projects/thresher-shark-tag/workflow.svg", caption: "Board, housing and code: three disciplines, one repository", wide: true } },
      { heading: "Where it stands",
        text: "The tag is in progress. I'll add photos of the board and enclosure, and what we learn from testing, as the build comes together." },
    ],
  },
  {
    id:      "transponder",
    title:   "Transponder",
    kind:    "Handheld device",
    summary: "An offline-first handheld calendar and task manager. No Wi-Fi by design: data moves over USB. 5\" capacitive touchscreen, haptic feedback, and a slim 3D-printed enclosure.",
    role:    "Co-designer: component selection, power system, enclosure.",
    tags:    ["hardware", "software"],
    tools:   ["RP2350 / Pico 2 W", "Nextion UART", "LiPo charging", "DRV2605L haptics"],
    status:  "In progress",
    team:    "Me + a friend",
    sections: [
      { heading: "Why build it",
        text: "Almost every planner today lives in the cloud. Transponder deliberately doesn't: it's a pocket calendar and task list that never connects to Wi-Fi. When you want your data on a computer, you plug it in over USB. Offline-first isn't a feature we might add later; it's the one rule the whole design follows." },
      { heading: "Choosing the parts",
        text: "The design started as a big e-paper screen and evolved as we weighed size, cost and responsiveness. These are the parts we've locked in:",
        bullets: [
          "Brain: Raspberry Pi Pico 2 W (RP2350), picked over the original Pico W for twice the RAM.",
          "Screen: Nextion 5\" capacitive touchscreen (800×480), driven over UART. It replaced the original 7.5\" e-paper display.",
          "Feedback: an LRA vibration motor with a DRV2605L driver. Haptics instead of a speaker keeps it quiet and small.",
          "Power: a 3.7 V 2000 mAh LiPo, a BQ24074 charger (upgraded from the common TP4056) and a TPS63031 buck-boost regulator for a steady 3.3 V.",
          "Timekeeping: a DS3231 real-time clock, so the calendar knows the date without the internet.",
          "A panel-mount USB-C port for charging and data.",
        ],
        image: { src: "media/projects/transponder/block-diagram.svg", caption: "How the parts connect: power in amber, signals in teal", wide: true } },
      { heading: "The enclosure",
        text: "We're aiming for a slim, phone-like slab. The case is a 3D-printable model built to be adjusted, so when a part changes, the housing can change with it instead of starting over." },
      { heading: "What's still open",
        text: "A hardware project is mostly decisions. The ones still on the table:",
        bullets: ["Sourcing the haptic motor", "The physical button layout", "Final enclosure style", "Verifying the USB-C configuration resistors"] },
    ],
  },
  {
    id:      "duck-race",
    title:   "Duck Race",
    kind:    "Team robotics · Mechanism design",
    summary: "A drawbridge-style ramp on an autonomous robot that delivers a rubber duck to a 500-point target zone. The rules allowed only one external motor, so a single servo reels the release string.",
    role:    "Designed the string-release system (center-of-mass focus); modeled the field and parts in Fusion 360.",
    tags:    ["hardware"],
    tools:   ["Fusion 360", "Laser cutting", "3D printing", "Servo control"],
    year:    "2026",
    // Article: add your sections here (see the TEMPLATE at the top). Photos go in media/projects/duck-race/
    sections: [
    ],
  },
  {
    id:      "natural-disaster-ecosystem",
    title:   "Natural Disaster Ecosystem",
    kind:    "AI · Public safety",
    summary: "An AI disaster-warning platform: a forecast engine predicts hurricanes days ahead, a dashboard serves first responders, and a civilian app offers a chatbot with hand-off to human operators. Piloting in Duval County, FL.",
    role:    "Co-builder: forecast engine (entered in the Nebius × NVIDIA AI Hackathon).",
    tags:    ["software", "ai"],
    tools:   ["Python", "Forecasting", "Mobile"],
    status:  "In progress",
    sections: [
      { heading: "The problem",
        text: "In a hurricane, time matters most. The earlier responders and residents know what's coming, the more they can do about it. We're building one system that serves both groups from the same forecast." },
      { heading: "Three parts, one forecast",
        bullets: [
          "Forecast engine: an AI model that predicts disasters days ahead.",
          "Responder dashboard: first responders see the AI predictions side by side with traditional algorithmic ones.",
          "Civilian app: alerts plus a chatbot for questions, which hands the conversation to a human operator when it needs a person.",
        ],
        image: { src: "media/projects/natural-disaster-ecosystem/overview.svg", caption: "One forecast engine feeding both the responder and the civilian side", wide: true } },
      { heading: "My part",
        text: "I work on the forecast engine. That same engine is our entry in the Nebius × NVIDIA Global AI Hackathon." },
      { heading: "Rollout",
        text: "We're starting small and local: Duval County, Florida. Then the plan is the rest of Florida, the United States, and eventually anywhere with a disaster season." },
    ],
  },
  {
    id:      "hand-tracking-cursor",
    title:   "Hand-Tracking Cursor",
    kind:    "Computer vision",
    summary: "Controls the cursor with your fingertip using a front-facing camera. Prototyped in Swift on iPad with Apple's Vision framework; a Windows port aimed at fully replacing the mouse is in progress.",
    tags:    ["software", "ai"],
    tools:   ["Swift", "Vision", "HCI"],
    status:  "In progress",
    sections: [
      { heading: "The idea",
        text: "What if the camera already in your device could replace the mouse? Point with a finger, and the cursor follows." },
      { heading: "The prototype",
        text: "I built the first version in Swift Playgrounds on my iPad. The front camera feeds Apple's Vision framework, which finds the hand and its key points. I take the fingertip's position in the frame and map it to a point on the screen.",
        image: { src: "media/projects/hand-tracking-cursor/pipeline.svg", caption: "Camera → hand pose → fingertip → cursor", wide: true } },
      { heading: "What's next",
        text: ["The goal is a Windows version good enough to use instead of a mouse all day, not just as a demo.",
               "You can try the same idea on this website: after unlocking the Rotunda Doors with your hands, you navigate the whole site with hand gestures."] },
    ],
  },
  {
    id:      "medicinal-magician",
    title:   "Medicinal Magician",
    kind:    "AI@UCF · Healthcare",
    summary: "A clinical decision-support app built in a semester sprint with UCF's AI club, team of three.",
    role:    "Backend developer.",
    tags:    ["software", "ai"],
    tools:   ["Backend", "LLMs", "Team project"],
    year:    "2026",
    team:    "Team of three",
    links:   [ { label: "GitHub", url: "https://github.com/SolariaNights/medicinal-magician" } ],
    sections: [
      { heading: "The project",
        text: "Medicinal Magician is a clinical decision-support app: a tool that helps a clinician think through a case with the help of an AI model. We built it as a semester sprint project in AI@UCF, the university's AI club." },
      { heading: "How we split it",
        text: "A teammate built the frontend, the part people see and click. I built the backend: the server side that takes requests from the app and works with the AI model to answer them.",
        image: { src: "media/projects/medicinal-magician/architecture.svg", caption: "The frontend talks to my backend, which works with the AI model", wide: true } },
      { heading: "Working in a sprint",
        text: "A fixed deadline and a small team meant agreeing early on how the frontend and backend talk to each other, so both halves could be built at the same time." },
    ],
  },
  {
    id:      "offline-voice-assistant",
    title:   "Offline Voice Assistant",
    kind:    "Local AI",
    summary: "A fully offline voice assistant that runs from a USB stick on any Windows PC: no internet, no subscriptions, no data leaving the device. Pipeline: voice activity detection → speech-to-text → local LLM → text-to-speech.",
    tags:    ["software", "ai"],
    tools:   ["faster-whisper", "Llama 3.2", "Piper TTS", "Silero VAD"],
    status:  "In progress",
    sections: [
      { heading: "Why offline",
        text: "Voice assistants usually send everything you say to a company's servers and charge a monthly fee for the good ones. I wanted the opposite: an assistant that runs entirely on the computer in front of you, keeps your data there, and costs nothing to keep using." },
      { heading: "The voice loop",
        text: "Four open-source models, chained together:",
        bullets: [
          "Silero VAD listens for when someone is actually speaking.",
          "faster-whisper turns the speech into text.",
          "Llama 3.2 3B, a small language model, writes the reply.",
          "Piper speaks the reply out loud.",
        ],
        image: { src: "media/projects/offline-voice-assistant/pipeline.svg", caption: "From your voice to a spoken answer, all on the local machine", wide: true } },
      { heading: "The plan",
        text: ["First, prove the loop works on my own machine using Ollama to run the model. Then port it to a self-contained version built on llama-cpp-python that lives entirely on a 64 GB+ USB 3.2 stick: plug it into any Windows PC and it runs.",
               "Longer term, this is the seed of something bigger: a private, personal assistant that learns from using it, without a subscription and without anyone else collecting the conversation."] },
    ],
  },
];

## Core Workflows to Automate

### Design to Component Pipeline
The agent should be used to pull Stitch mockups directly into working UI components.
* Prompt: `"Fetch the 'Login Screen' from my Stitch project and convert it into a responsive React component using Tailwind CSS."`

### Design System Validation
The agent can inspect files to ensure the codebase strictly matches design parameters.
* Prompt: `"Check the buttons in my components folder against the Stitch project styles to see if the colors and border radiuses match."`

### Iterative Design Variations
You can ask the agent to leverage Stitch's canvas to quickly draft UI iterations.
* Prompt: `"Generate a dashboard variation in Stitch that includes a new dark-mode metrics panel."`

## Codebase Boundaries
* **Read Limits**: Do not modify core backend route logic when executing front-end component building unless specifically asked.
* **Design Synchronization**: Always verify the correct target project ID via `list_projects` before attempting to write code based on a UI screen name.

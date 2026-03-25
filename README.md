# Claude Browser Agent

A powerful AI-driven browser automation plugin inspired by Claude's capabilities. This extension extends web browsers with Claude-powered agents for intelligent web interaction, data extraction, and task automation.

## Features

- **AI-Powered Web Automation**: Automate complex web tasks using Claude AI
- - **Intelligent Data Extraction**: Extract and structure data from web pages
  - - **Web Scraping**: Collect data efficiently with AI guidance
    - - **Task Automation**: Execute repetitive tasks across multiple pages
      - - **Interactive Mode**: Real-time interaction with AI for web tasks
        - - **Multi-Tab Support**: Manage multiple browser tabs simultaneously
         
          - ## Tech Stack
         
          - - **Framework**: Manifest V3 (Chrome/Edge compatible)
            - - **Backend**: Claude API for AI capabilities
              - - **Language**: TypeScript/JavaScript
                - - **State Management**: Modern browser APIs
                  - - **Communication**: Message passing support
                   
                    - ## Project Structure
                   
                    - ```
                      claude-browser-agent/
                      ├── src/
                      │   ├── background/        # Service worker scripts
                      │   ├── content/          # Content scripts for page interaction
                      │   ├── popup/            # Extension popup UI
                      │   └── utils/            # Helper utilities
                      ├── manifest.json         # Extension manifest
                      └── README.md
                      ```

                      ## Installation

                      1. Clone the repository
                      2. 2. Install dependencies: `npm install`
                         3. 3. Build: `npm run build`
                            4. 4. Load in browser (Chrome/Edge): Go to extensions, enable Developer mode, load dist/ folder
                              
                               5. ## Development
                              
                               6. - `npm run dev` - Start development with hot reload
                                  - - `npm run build` - Build production
                                    - - `npm test` - Run tests
                                     
                                      - ## API Configuration
                                     
                                      - Configure your Claude API key in the extension settings.
                                     
                                      - ## License
                                     
                                      - MIT License

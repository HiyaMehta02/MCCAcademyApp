MCCC Academy App 🏏
🔗 Links:

GitHub Repository

Figma Design & Prototypes

Supabase Database Dashboard

The MCCC Academy App is a dedicated mobile application designed for the Muscat Cricket Coaching Centre (MCCC). Built with a strong emphasis on intuitive UI/UX and user-centered design, the app serves as a centralized platform to connect coaches and players, streamlining scheduling, communication, and player development.

🚀 Tech Stack
Frontend (Client): Mobile application built with JavaScript/TypeScript, focusing on interactive and seamless navigation.

Backend (Server): Node.js-based backend environment for API and data handling.

Database & Auth: Supabase for scalable database management.

🎨 UI/UX & Design Process
The initial phases of this project heavily involved wireframing and prototyping using Figma to ensure the best possible experience for both coaches and players before active development began.

📁 Repository Structure
The project is organized into two main directories:

/client: Contains the mobile application source code, UI components, and client-side logic.

/server: Contains the backend API, server-side business logic, and database configuration.

⚙️ Environment Variables
To run this project locally, you will need to create .env files in both the client and server directories.

Client Environment Variables (client/.env)
Create a .env file in the root of the /client folder and add your local IP address:

Code snippet
IP_ADDRESS="Your IP Address"
(Note: You can usually find your IP address by running ipconfig on Windows or ifconfig on Mac/Linux. This is often required for local mobile testing.)

Server Environment Variables (server/.env)
Create a .env file in the root of the /server folder. Add your necessary backend variables here:

Code snippet
SUPABASE_URL = "api_url"
SUPABASE_KEY = "api_key"

🛠️ Getting Started
Prerequisites
Make sure you have the following installed on your local machine:

Node.js (v16 or higher recommended)

npm or yarn

Installation
Clone the repository:

Bash
git clone https://github.com/HiyaMehta02/MCCAcademyApp.git
cd MCCAcademyApp
Install Client Dependencies:

Bash
cd client
npm install
Install Server Dependencies:

Bash
cd ../server
npm install
Running the Application Locally
Starting the Client:
To run the mobile application in your development environment:

Bash
cd client
npm run dev
Starting the Server:

Bash
cd server
node database.js
Note: This is an active project in ongoing development.

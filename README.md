# MCCC Academy App 🏏

**🔗 Links:**
* [GitHub Repository](https://github.com/HiyaMehta02/MCCAcademyApp)
* [Figma Design & Prototypes](https://www.figma.com/design/1qdwx5CAK5xDp4qd2zrbPt/MCCC-APP?node-id=0-1&p=f&t=owy36VCPtUUc53Am-0)
* [Supabase Database Dashboard](https://supabase.com/dashboard/project/wukmanrpnbfoyqtjdxjs)

The MCCC Academy App is a dedicated mobile application designed for the Muscat Cricket Coaching Centre (MCCC). Built with a strong emphasis on intuitive UI/UX and user-centered design, the app serves as a centralized platform to connect coaches and players, streamlining scheduling, communication, and player development.

## 🚀 Tech Stack

* **Frontend (Client):** Mobile application built with **React Native (Expo)** and JavaScript/TypeScript, focusing on interactive and seamless navigation.
* **Backend (Server):** **Python-based FastAPI** environment for API handling and AI-driven Face Recognition.
* **Database & Auth:** [Supabase](https://supabase.com/) for scalable database management and authentication.

## 🎨 UI/UX & Design Process

The initial phases of this project heavily involved wireframing and prototyping using Figma to ensure the best possible experience for both coaches and players before active development began.

## 📁 Repository Structure

The project is organized into two main directories:

* **`/client`**: Contains the mobile application source code (Expo), UI components, and client-side logic.
* **`/server`**: Contains the FastAPI backend, Python logic, and **Virtual Environment (`venv`)** for dependency isolation.

## ⚙️ Environment Variables

To run this project locally, you will need to create `.env` files in both the client and server directories.

### Client Environment Variables (`client/.env`)

Create a `.env` file in the root of the `/client` folder. **Note:** Expo requires the `EXPO_PUBLIC_` prefix for variables to be accessible in the app.

```env
EXPO_PUBLIC_IP_ADDRESS="Your Local IP Address"
```

### Server Environment Variables (`server/.env`)

Create a `.env` file in the root of the `/server` folder:

```env
SUPABASE_URL="your_supabase_project_url"
SUPABASE_KEY="your_supabase_anon_key"
```

## 🛠️ Getting Started

### Prerequisites

Make sure you have the following installed on your local machine:

* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* [Python](https://www.python.org/) (v3.11 or v3.12 recommended)
* **C++ Build Tools:** Required for the `face_recognition` library. (On Windows, install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and select "Desktop development with C++")

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/HiyaMehta02/MCCAcademyApp.git](https://github.com/HiyaMehta02/MCCAcademyApp.git)
   cd MCCAcademyApp
   ```

2. **Install Client Dependencies:**
   ```bash
   cd client
   npm install
   ```

3. **Install Server Dependencies (Python Venv):**
   ```bash
   cd ../server
   # Create the virtual environment
   python -m venv venv

   # Activate the environment (Windows)
   .\venv\Scripts\activate

   # Install core dependencies
   pip install -r requirements.txt

   # Install the AI models directly from source
   pip install git+[https://github.com/ageitgey/face_recognition_models](https://github.com/ageitgey/face_recognition_models)
   ```

### Running the Application Locally

**Starting the Client:**
```bash
cd client
npm start
```

**Starting the Server:**
*(Ensure your virtual environment `(venv)` is activated before running)*
```bash
cd server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

*Note: This is an active project in ongoing development.*

# 🦊 FOX – Streaming Platform

Netflix-style streaming website built with Flask.

## Local Chalane Ka Tarika

```bash
pip install -r requirements.txt
python app.py
```
Then open: http://127.0.0.1:5000

## Render.com Pe Deploy Karna (FREE)

1. GitHub pe upload karo (saari files)
2. [render.com](https://render.com) pe account banao
3. "New Web Service" → GitHub repo select karo
4. Yeh settings rakho:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
5. Deploy karo!

## Features
- 🎬 Movies & Series browse
- 🎮 Games section  
- 🔐 Login / Register
- 📱 Mobile responsive
- 🎥 Custom video player (YouTube trailers)
- 🤖 Fox AI page

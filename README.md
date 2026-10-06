# Personal Finance Tracker

This is a small app I built to keep track of my day-to-day income and expenses. I didn't want anything fancy — no bank syncing, no budgeting goals, no logins, none of that. Just a place to log what money came in, what went out, and see where it's actually going each month.

## Why I made this

I looked at a few finance apps and they all felt way more complicated than what I actually needed. I just wanted to type in a transaction, pick a category, and see a quick breakdown. So instead of signing up for another app, I decided to just build my own in an afternoon.

## How I built it

I used Claude Code (Anthropic's coding assistant/CLI) to build this. Before writing any code, I had it walk me through the requirements first — what should be in scope, what shouldn't, whether I needed login, where the data should live, stuff like that. Once that was settled, it put together the whole app: backend, database, frontend, the works.

Tech-wise it's intentionally boring and simple:

- **Backend:** Python + Flask. It's just a handful of routes for creating, listing, editing, and deleting transactions, plus one route that calculates the monthly summary (income, expenses, balance, and totals per category).
- **Database:** SQLite. One table, one file (`finance.db`). No server to set up, no credentials to manage — it just lives next to the app.
- **Frontend:** plain HTML/CSS/JS. No React, no build step, nothing to compile. The page just calls the Flask API with `fetch()` and re-renders itself.
- **Chart:** Chart.js (loaded from a CDN) for the spending-by-category pie chart.

That's it. No auth, no accounts, no cloud. It runs on my own machine and the data stays on my own machine.

## What it actually does

- Add a transaction — date, income or expense, category, amount, and an optional note
- Edit or delete any transaction
- Filter everything by month
- See totals for income, expenses, and balance for whatever month you're looking at
- A pie chart showing which categories you're spending the most on

## Running it locally

You'll need Python installed. Then:

```
pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000` in your browser and that's it. The database file gets created automatically the first time you run it.

## A note on the data

`finance.db` is not committed to this repo (it's in `.gitignore`) since it holds actual transaction data. If you clone this, you'll start with an empty database and it'll fill up as you use it.

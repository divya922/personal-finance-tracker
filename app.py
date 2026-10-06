import sqlite3
from pathlib import Path

from flask import Flask, g, jsonify, render_template, request

DB_PATH = Path(__file__).parent / "finance.db"

app = Flask(__name__)


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_exception):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            note TEXT
        )
        """
    )
    conn.commit()
    conn.close()


def row_to_dict(row):
    return {
        "id": row["id"],
        "date": row["date"],
        "type": row["type"],
        "category": row["category"],
        "amount": row["amount"],
        "note": row["note"],
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/transactions", methods=["GET"])
def list_transactions():
    month = request.args.get("month")
    db = get_db()
    if month:
        rows = db.execute(
            "SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC, id DESC",
            (f"{month}%",),
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT * FROM transactions ORDER BY date DESC, id DESC"
        ).fetchall()
    return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/transactions", methods=["POST"])
def create_transaction():
    data = request.get_json()
    db = get_db()
    cur = db.execute(
        "INSERT INTO transactions (date, type, category, amount, note) VALUES (?, ?, ?, ?, ?)",
        (data["date"], data["type"], data["category"], float(data["amount"]), data.get("note")),
    )
    db.commit()
    row = db.execute("SELECT * FROM transactions WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(row_to_dict(row)), 201


@app.route("/api/transactions/<int:transaction_id>", methods=["PUT"])
def update_transaction(transaction_id):
    data = request.get_json()
    db = get_db()
    db.execute(
        "UPDATE transactions SET date = ?, type = ?, category = ?, amount = ?, note = ? WHERE id = ?",
        (
            data["date"],
            data["type"],
            data["category"],
            float(data["amount"]),
            data.get("note"),
            transaction_id,
        ),
    )
    db.commit()
    row = db.execute("SELECT * FROM transactions WHERE id = ?", (transaction_id,)).fetchone()
    if row is None:
        return jsonify({"error": "not found"}), 404
    return jsonify(row_to_dict(row))


@app.route("/api/transactions/<int:transaction_id>", methods=["DELETE"])
def delete_transaction(transaction_id):
    db = get_db()
    db.execute("DELETE FROM transactions WHERE id = ?", (transaction_id,))
    db.commit()
    return "", 204


@app.route("/api/summary", methods=["GET"])
def summary():
    month = request.args.get("month")
    db = get_db()
    if month:
        rows = db.execute(
            "SELECT type, category, amount FROM transactions WHERE date LIKE ?",
            (f"{month}%",),
        ).fetchall()
    else:
        rows = db.execute("SELECT type, category, amount FROM transactions").fetchall()

    income = sum(r["amount"] for r in rows if r["type"] == "income")
    expenses = sum(r["amount"] for r in rows if r["type"] == "expense")

    by_category = {}
    for r in rows:
        if r["type"] == "expense":
            by_category[r["category"]] = by_category.get(r["category"], 0) + r["amount"]

    return jsonify(
        {
            "income": income,
            "expenses": expenses,
            "balance": income - expenses,
            "by_category": [
                {"category": category, "total": total}
                for category, total in sorted(by_category.items(), key=lambda kv: -kv[1])
            ],
        }
    )


init_db()

if __name__ == "__main__":
    app.run(debug=True)

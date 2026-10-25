"use client";
import { useEffect, useRef, useState } from "react";
import { ROWS, COLS, COLORS, charToCode, codeToChar, emptyBoard } from "@/lib/shared";

type Board = number[][];
type Saved = { id: string; name: string; layout: Board; created_by: string | null };
const hexOf = (n: number) => COLORS.find((c) => c.code === n)?.hex;

function fromSentence(text: string): Board {
  const lines: string[] = [];
  let cur = "";
  for (const w of text.toUpperCase().split(/\s+/).filter(Boolean)) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= COLS) cur += " " + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  const b = emptyBoard();
  const top = Math.max(0, Math.floor((ROWS - lines.length) / 2));
  lines.slice(0, ROWS).forEach((l, i) => {
    const line = l.slice(0, COLS);
    const left = Math.floor((COLS - line.length) / 2);
    [...line].forEach((ch, j) => { b[top + i][left + j] = charToCode(ch) ?? 0; });
  });
  return b;
}

async function api(path: string, pass: string, init?: RequestInit) {
  const r = await fetch(path, { ...init, headers: { "Content-Type": "application/json", "x-passcode": pass } });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Something went wrong");
  return d;
}

export default function Home() {
  const [pass, setPass] = useState("");
  const [who, setWho] = useState("");
  const [board, setBoard] = useState<Board>(emptyBoard());
  const [sel, setSel] = useState<[number, number]>([0, 0]);
  const [msg, setMsg] = useState("");
  const [sentence, setSentence] = useState("");
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<Saved[]>([]);
  const [ws, setWs] = useState(false);
  const [morning, setMorning] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPass(localStorage.getItem("pass") || "");
    setWho(localStorage.getItem("who") || "");
  }, []);
  useEffect(() => {
    if (!pass) return;
    loadSaved();
    run(async () => {
      const s = await api("/api/settings", pass);
      setWs(s.worldSeries);
      setMorning(s.morning);
    });
  }, [pass]);

  const run = async (fn: () => Promise<void>) => {
    try { await fn(); } catch (e: any) { setMsg(e.message); }
  };
  const loadSaved = () => run(async () => setSaved((await api("/api/boards", pass)).boards));

  const advance = ([r, c]: [number, number]): [number, number] =>
    c + 1 < COLS ? [r, c + 1] : r + 1 < ROWS ? [r + 1, 0] : [r, c];

  const put = (code: number) => {
    const b = board.map((row) => [...row]);
    b[sel[0]][sel[1]] = code;
    setBoard(b);
    setSel(advance(sel));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const [r, c] = sel;
    const go = (nr: number, nc: number) => setSel([Math.min(ROWS - 1, Math.max(0, nr)), Math.min(COLS - 1, Math.max(0, nc))]);
    if (e.key === "Backspace") {
      e.preventDefault();
      const prev: [number, number] = board[r][c] !== 0 ? [r, c] : c > 0 ? [r, c - 1] : r > 0 ? [r - 1, COLS - 1] : [r, c];
      const b = board.map((row) => [...row]);
      b[prev[0]][prev[1]] = 0;
      setBoard(b); setSel(prev);
    } else if (e.key === "ArrowLeft") go(r, c - 1);
    else if (e.key === "ArrowRight") go(r, c + 1);
    else if (e.key === "ArrowUp") go(r - 1, c);
    else if (e.key === "ArrowDown") go(r + 1, c);
    else if (e.key === "Enter") go(r + 1, 0);
  };

  const onInput = (e: React.FormEvent<HTMLInputElement>) => {
    const v = e.currentTarget.value;
    e.currentTarget.value = "";
    const code = v ? charToCode(v[v.length - 1]) : null;
    if (code !== null) put(code);
  };

  if (!pass)
    return (
      <main>
        <h1>Our Vestaboard</h1>
        <div className="row">
          <input placeholder="Your name" value={who} onChange={(e) => setWho(e.target.value)} />
          <input placeholder="Family passcode" type="password" id="p" />
          <button onClick={() => {
            const p = (document.getElementById("p") as HTMLInputElement).value;
            localStorage.setItem("pass", p); localStorage.setItem("who", who); setPass(p);
          }}>Let me in</button>
        </div>
      </main>
    );

  return (
    <main>
      <h1>Our Vestaboard</h1>
      <input ref={input} className="hidden-input" onInput={onInput} onKeyDown={onKeyDown}
        autoCapitalize="characters" autoComplete="off" aria-label="Type on the board" />
      <div className="frame">
        <div className="grid">
          {board.map((row, r) => row.map((code, c) => (
            <div key={`${r}-${c}`}
              className={"cell" + (sel[0] === r && sel[1] === c ? " sel" : "")}
              style={hexOf(code) ? { background: hexOf(code) } : undefined}
              onClick={() => { setSel([r, c]); input.current?.focus(); }}>
              {codeToChar(code)}
            </div>
          )))}
        </div>
      </div>

      <div className="row">
        {COLORS.map((c) => (
          <div key={c.code} className="swatch" title={c.name} style={{ background: c.hex }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { put(c.code); input.current?.focus(); }} />
        ))}
        <button className="ghost" onClick={() => put(0)}>Blank</button>
      </div>

      <div className="row">
        <button className="send" onClick={() => run(async () => {
          setMsg("Sending...");
          await api("/api/send", pass, { method: "POST", body: JSON.stringify({ layout: board }) });
          setMsg("Sent! The board is flipping now.");
        })}>Send to Vestaboard</button>
        <button className="ghost" onClick={() => { setBoard(emptyBoard()); setSel([0, 0]); }}>Clear</button>
        <button className="ghost" onClick={() => run(async () => {
          setBoard((await api("/api/send", pass)).layout); setMsg("Loaded what is on the board now.");
        })}>Load current board</button>
      </div>
      <div className="msg">{msg}</div>

      <label className="row" style={{ fontWeight: 600 }}>
        <input type="checkbox" checked={ws} style={{ width: 24, height: 24 }}
          onChange={(e) => run(async () => {
            const on = e.target.checked;
            await api("/api/settings", pass, { method: "POST", body: JSON.stringify({ worldSeries: on }) });
            setWs(on);
            setMsg(on ? "World Series updates are on. Refreshing..." : "World Series updates are off.");
            if (on) setTimeout(() => window.location.reload(), 1500);
          })} />
        World Series score updates
      </label>

      <label className="row" style={{ fontWeight: 600 }}>
        <input type="checkbox" checked={morning} style={{ width: 24, height: 24 }}
          onChange={(e) => run(async () => {
            const on = e.target.checked;
            await api("/api/settings", pass, { method: "POST", body: JSON.stringify({ morning: on }) });
            setMorning(on);
            setMsg(on ? "Morning updates are on (7 to 8 AM, weekdays)." : "Morning updates are off.");
          })} />
        Morning updates (7 to 8 AM, weekdays)
      </label>

      <div>
        <textarea rows={2} placeholder="Or type a sentence and we will center it for you"
          value={sentence} onChange={(e) => setSentence(e.target.value)} />
        <button className="ghost" onClick={() => setBoard(fromSentence(sentence))}>Fill the board</button>
      </div>

      <div className="row">
        <input placeholder="Name this board" value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={() => run(async () => {
          await api("/api/boards", pass, { method: "POST", body: JSON.stringify({ name, layout: board, by: who }) });
          setName(""); setMsg("Saved."); loadSaved();
        })}>Save board</button>
      </div>
      <div className="row">
        {saved.length === 0 && <span>No saved boards yet. Make one and save it.</span>}
        {saved.map((s) => (
          <button key={s.id} className="ghost" onClick={() => setBoard(s.layout)}>
            {s.name}{s.created_by ? ` (${s.created_by})` : ""}
          </button>
        ))}
      </div>
    </main>
  );
}

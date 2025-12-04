async function api(path, method="GET", body=null) {
  const opts = { method, headers: {} };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  return res.json();
}

async function refresh() {
  const state = await api("/api/state");
  const container = document.getElementById("playersArea");
  container.innerHTML = "";

  state.players.forEach(p => {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4";

    const card = document.createElement("div");
    card.className = "card player-card";
    if (state.winners.includes(p.id)) card.classList.add("winner");

    const body = document.createElement("div");
    body.className = "card-body";

    const header = document.createElement("div");
    header.className = "d-flex justify-content-between align-items-center mb-2";
    header.innerHTML = `<h5 class="card-title mb-0">${p.name}</h5><div><strong>${p.score}</strong></div>`;

    const framesDiv = document.createElement("div");
    framesDiv.className = "mb-3";

    // show frames inline
    for (let i=0; i<10; i++) {
      const f = p.frames[i] || [];
      const fr = document.createElement("div");
      fr.className = "frame";
      fr.innerHTML = `<div class="frame-small">F${i+1}</div><div>${formatFrame(f)}</div>`;
      framesDiv.appendChild(fr);
    }

    const controls = document.createElement("div");
    controls.className = "d-flex flex-wrap align-items-center";

    // Determine allowed maximum pins for the next roll for this player
    // Default allow 0..10
    let allowedMax = 10;
    try {
      const frames = p.frames || [];
      // find first incomplete frame
      for (let i = 0; i < 10; i++) {
        const f = frames[i] || [];
        if (i < 9) {
          // frames 1-9
          if (f.length === 0) {
            // next roll is first roll of this frame -> allow 0..10
            allowedMax = 10;
            break;
          }
          if (f.length === 1) {
            // if it's a strike (10) it's actually a complete frame
            if (f[0] === 10) continue;
            // incomplete: second roll limited to (10 - first)
            allowedMax = 10 - (f[0] || 0);
            break;
          }
          // length 2 -> complete, continue
          continue;
        } else {
          // 10th frame
          if (f.length === 0) {
            allowedMax = 10;
            break;
          }
          if (f.length === 1) {
            if (f[0] === 10) {
              // strike on first -> second roll 0..10
              allowedMax = 10;
            } else {
              // second roll limited to 10 - first
              allowedMax = 10 - (f[0] || 0);
            }
            break;
          }
          if (f.length === 2) {
            // if strike on first OR spare, third roll allowed 0..10
            if (f[0] === 10 || (f[0] + f[1] === 10)) {
              allowedMax = 10;
              break;
            }
            // otherwise frame complete
            continue;
          }
          // length 3 -> complete
          continue;
        }
      }
    } catch (e) {
      allowedMax = 10;
    }

    // pins buttons 0..10
    for (let pins=0; pins<=10; pins++) {
      const b = document.createElement("button");
      b.className = "btn btn-sm btn-outline-secondary btn-pins";
      b.textContent = pins;
      // disable and grey out if this pin value would exceed the allowed maximum
      if (pins > allowedMax) {
        b.disabled = true;
        b.classList.add('disabled');
        b.setAttribute('aria-disabled', 'true');
      } else {
        b.onclick = async () => {
          await api("/api/roll", "POST", { id: p.id, pins: pins });
          await refresh();
        };
      }
      controls.appendChild(b);
    }

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-sm btn-danger ms-auto";
    removeBtn.textContent = "Entfernen";
    removeBtn.onclick = async () => {
      await api("/api/remove_player", "POST", { id: p.id });
      await refresh();
    };

    body.appendChild(header);
    body.appendChild(framesDiv);
    body.appendChild(controls);
    body.appendChild(removeBtn);
    card.appendChild(body);
    col.appendChild(card);
    container.appendChild(col);
  });
}

function formatFrame(f) {
  if (!f || f.length === 0) return "-";
  if (f.length === 1) {
    if (f[0] === 10) return "X";
    return f[0].toString();
  }
  // two or three rolls (10th)
  if (f.length === 2) {
    if (f[0] === 10) return `X, ${f[1]}`;
    if (f[0] + f[1] === 10) return `${f[0]}, /`;
    return `${f[0]}, ${f[1]}`;
  }
  if (f.length === 3) {
    // 10th frame display
    const a = f[0] === 10 ? "X" : f[0];
    const b = f[1] === 10 ? "X" : (f[0] + f[1] === 10 ? "/" : f[1]);
    const c = f[2] === 10 ? "X" : f[2];
    return `${a}, ${b}, ${c}`;
  }
  return f.join(",");
}

document.getElementById("addPlayerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("playerName").value.trim();
  await api("/api/add_player", "POST", { name });
  document.getElementById("playerName").value = "";
  await refresh();
});

document.getElementById("resetBtn").addEventListener("click", async () => {
  if (!confirm("Spiel wirklich resetten?")) return;
  await api("/api/reset", "POST");
  await refresh();
});

// initial load
refresh();

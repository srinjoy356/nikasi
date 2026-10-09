"""Run the vision model (local container) on photos with the exact prompt and schema the Lambda uses."""
import base64, json, sys, time, urllib.request
sys.path.insert(0, "backend/src")
src = open("backend/src/nikasi/tasks.py", encoding="utf-8").read()
ns = {}
exec(src[src.index("PROMPT ="):src.index("def vlm_call")], ns)
URL = "http://localhost:18080/v1/chat/completions"
for path in sys.argv[1:]:
    img = base64.b64encode(open(path, "rb").read()).decode()
    body = {"messages": [{"role": "user", "content": [{"type": "text", "text": ns["PROMPT"]},
            {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + img}}]}],
            "max_tokens": 200, "temperature": 0.1, "response_format": {"type": "json_object", "schema": ns["SCHEMA"]}}
    t = time.time()
    try:
        r = json.load(urllib.request.urlopen(urllib.request.Request(URL, json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=300))
        print("%-16s %4.1fs  %s" % (path.split("/")[-1], time.time() - t, json.dumps(json.loads(r["choices"][0]["message"]["content"]))[:230]))
    except Exception as e:
        print(path, "ERR", e)

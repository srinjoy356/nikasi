"""Ask the local vision model simple questions (caption + yes/no) and time them."""
import base64, json, sys, time, urllib.request
URL = "http://localhost:18080/v1/chat/completions"
QS = [("describe", "Describe this photo in one sentence.", 90),
      ("garbage", "Is there garbage, plastic bags, bottles or litter visible? Answer only yes or no.", 3),
      ("mud", "Is there mud, silt, sand or soil piled on or around a drain or gutter? Answer only yes or no.", 3),
      ("water", "Is there standing or stagnant water on the ground? Answer only yes or no.", 3),
      ("drain", "Is a drain, gutter, drain cover or sewer opening visible? Answer only yes or no.", 3)]
def ask(img, q, n):
    body = {"messages": [{"role": "user", "content": [{"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + img}}, {"type": "text", "text": q}]}],
            "max_tokens": n, "temperature": 0, "cache_prompt": True}
    return json.load(urllib.request.urlopen(urllib.request.Request(URL, json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=300))["choices"][0]["message"]["content"].strip()
for path in sys.argv[1:]:
    img = base64.b64encode(open(path, "rb").read()).decode()
    print("==", path.split("/")[-1])
    for k, q, n in QS:
        t = time.time(); a = ask(img, q, n)
        print("  %-8s %4.1fs  %s" % (k, time.time() - t, a[:260].replace("\n", " ")))

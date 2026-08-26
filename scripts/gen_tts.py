# Generate neural Chinese clips via edge-tts
import asyncio, os, random
import edge_tts

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "assets", "tts"))
SUIT = {"hk": "黑桃", "ht": "红桃", "mh": "梅花", "fk": "方块"}
RANK = {"A": "A", "2": "二", "3": "三", "4": "四", "5": "五", "6": "六", "7": "七",
        "8": "八", "9": "九", "10": "十", "J": "勾", "Q": "圈", "K": "K"}
VOICES = {
    "yujie":  ("zh-CN-XiaoxiaoNeural", "-8%", "-2Hz"),
    "loli":   ("zh-CN-XiaoyiNeural", "+10%", "+5Hz"),
    "dia":    ("zh-CN-liaoning-XiaobeiNeural", "+6%", "+4Hz"),
    "dahai":  ("zh-CN-XiaoxiaoNeural", "-20%", "-5Hz"),
    "jieliu": ("zh-CN-YunjianNeural", "+8%", "+0Hz"),
    "dashu":  ("zh-CN-YunyangNeural", "-12%", "-6Hz"),
    "youth":  ("zh-CN-YunxiNeural", "+2%", "+1Hz"),
}
JIELIU_CARD = [
    "操，{c}，接着！",
    "卧槽{c}，谁接？",
    "{c}砸过去！",
    "来，{c}，别怂！",
    "我靠{c}，整死你！",
    "{c}，哈，接啊废物！",
    "给你{c}，吃不吃？",
    "{c}走起，别装死！",
]
JIELIU_KILL = [
    "杀！{c}毙了你！",
    "操，杀！{c}砸脸上！",
    "杀爆！{c}！",
    "你妈的杀，{c}！",
]
YUJIE = "{c}。"
LOLI = "{c}哦。"
DIA = "{c}呀。"
DAHAI = "嗯……{c}……"
DASHU = "{c}。"
YOUTH = "{c}。"

def keys():
    out = []
    for s in SUIT:
        for r in RANK:
            out.append((s + r, SUIT[s] + RANK[r]))
    out.append(("xw", "小王"))
    out.append(("dw", "大王"))
    return out

async def one(sem, voice, rate, pitch, text, path):
    async with sem:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if os.path.exists(path) and os.path.getsize(path) > 400:
            return
        comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        await comm.save(path)
        print("ok", os.path.basename(os.path.dirname(path)), os.path.basename(path), text)

async def main():
    sem = asyncio.Semaphore(5)
    jobs = []
    cards = keys()
    for vid, (voice, rate, pitch) in VOICES.items():
        folder = os.path.join(ROOT, vid)
        for key, label in cards:
            if vid == "jieliu":
                text = JIELIU_CARD[hash(key) % len(JIELIU_CARD)].format(c=label)
                jobs.append(one(sem, voice, rate, pitch, text, os.path.join(folder, key + ".mp3")))
                text2 = JIELIU_KILL[hash(key + "k") % len(JIELIU_KILL)].format(c=label)
                jobs.append(one(sem, voice, rate, pitch, text2, os.path.join(folder, key + "_k.mp3")))
            elif vid == "dahai":
                jobs.append(one(sem, voice, rate, pitch, DAHAI.format(c=label), os.path.join(folder, key + ".mp3")))
            elif vid == "dia":
                jobs.append(one(sem, voice, rate, pitch, DIA.format(c=label), os.path.join(folder, key + ".mp3")))
            elif vid == "loli":
                jobs.append(one(sem, voice, rate, pitch, LOLI.format(c=label), os.path.join(folder, key + ".mp3")))
            else:
                jobs.append(one(sem, voice, rate, pitch, label + "。", os.path.join(folder, key + ".mp3")))
        extras = {
            "yujie": [("preview", "我是御姐音。"), ("pass", "不出。"), ("kill", "杀。")],
            "loli": [("preview", "我是萝莉音哦。"), ("pass", "不出啦。"), ("kill", "杀掉！")],
            "dia": [("preview", "人家是嗲嗲音呀。"), ("pass", "不出嘛。"), ("kill", "杀掉人家啦。")],
            "dahai": [("preview", "嗯……叫大海。今晚把你弄到腿软。"), ("pass", "不出……先含着。"), ("kill", "嗯啊……杀掉。")],
            "jieliu": [
                ("preview", "街溜子来了，报牌全他妈脏话，接不住就滚！"),
                ("pass", "不出你妈的！"),
                ("pass2", "过你妈逼，怂了！"),
                ("pass3", "不出？阳痿啊！"),
                ("kill", "杀！毙了你！"),
            ],
            "dashu": [("preview", "大叔音，出牌报给你听。"), ("pass", "不出。"), ("kill", "杀。")],
            "youth": [("preview", "青年音，走起。"), ("pass", "不出。"), ("kill", "杀！")],
        }
        for name, text in extras[vid]:
            jobs.append(one(sem, voice, rate, pitch, text, os.path.join(folder, name + ".mp3")))
    await asyncio.gather(*jobs)
    print("done", len(jobs))

if __name__ == "__main__":
    asyncio.run(main())

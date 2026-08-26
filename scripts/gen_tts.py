# Generate neural Chinese clips via edge-tts (overwrite)
import asyncio, os, hashlib, sys
import edge_tts

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "assets", "tts"))
SUIT = {"hk": "黑桃", "ht": "红桃", "mh": "梅花", "fk": "方块"}
RANK = {"A": "A", "2": "二", "3": "三", "4": "四", "5": "五", "6": "六", "7": "七",
        "8": "八", "9": "九", "10": "十", "J": "勾", "Q": "圈", "K": "K"}

# 口语化语速/音高，避免新闻腔
VOICES = {
    "yujie":  ("zh-CN-XiaoxiaoNeural", "-12%", "-3Hz"),
    "loli":   ("zh-CN-XiaoyiNeural", "+6%", "+4Hz"),
    "dia":    ("zh-CN-liaoning-XiaobeiNeural", "+2%", "+3Hz"),
    "dahai":  ("zh-CN-XiaoxiaoNeural", "-24%", "-6Hz"),
    "jieliu": ("zh-CN-YunjianNeural", "-8%", "-3Hz"),
    "dashu":  ("zh-CN-YunyangNeural", "-16%", "-8Hz"),
    "youth":  ("zh-CN-YunxiNeural", "-4%", "+0Hz"),
}

JIELIU_CARD = [
    "操，{c}砸过去，接着！",
    "哎你丫的，{c}，接啊！",
    "我靠{c}，谁接得住？",
    "{c}走起，别装孙子！",
    "给你{c}，吃不吃？",
    "卧槽{c}，整死你！",
    "{c}，哈，废物接着！",
    "来来来，{c}，怂了就滚！",
    "操了个，{c}，接不住回家吃奶！",
    "{c}拍桌上了，接着啊你！",
    "就这，{c}，接着呗！",
    "哈，{c}，你能吃几张？",
]
JIELIU_KILL = [
    "杀！{c}毙了你！",
    "操，杀！{c}砸脸上！",
    "杀爆！{c}！",
    "你妈的杀，{c}！",
    "杀进去，{c}，躺平吧！",
    "主牌杀！{c}，接啊废物！",
]
YUJIE = [
    "嗯，{c}。",
    "出{c}。",
    "{c}，接着。",
]
LOLI = [
    "{c}哦。",
    "出{c}啦。",
    "{c}，接着呀。",
]
DIA = [
    "人家出{c}嘛。",
    "{c}呀。",
    "给，{c}哦。",
]
DAHAI = [
    "嗯……{c}……含住。",
    "哈……{c}……再深一点。",
    "嗯啊，{c}……别停。",
]
DASHU = [
    "{c}，走一趟。",
    "这张，{c}。",
    "出{c}。",
]
YOUTH = [
    "{c}，走起。",
    "出{c}。",
    "{c}来了。",
]

def pick(arr, seed):
    h = int(hashlib.md5(seed.encode("utf-8")).hexdigest(), 16)
    return arr[h % len(arr)]

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
        for attempt in range(3):
            try:
                comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
                await comm.save(path)
                print("ok", os.path.basename(os.path.dirname(path)), os.path.basename(path), text, flush=True)
                return
            except Exception as e:
                print("retry", path, e, flush=True)
                await asyncio.sleep(0.6 * (attempt + 1))
        print("FAIL", path, text, flush=True)

async def main():
    sem = asyncio.Semaphore(8)
    jobs = []
    cards = keys()
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for vid, (voice, rate, pitch) in VOICES.items():
        if only and vid != only:
            continue
        folder = os.path.join(ROOT, vid)
        for key, label in cards:
            if vid == "jieliu":
                text = pick(JIELIU_CARD, key).format(c=label)
                jobs.append(one(sem, voice, rate, pitch, text, os.path.join(folder, key + ".mp3")))
                text2 = pick(JIELIU_KILL, key + "k").format(c=label)
                jobs.append(one(sem, voice, rate, pitch, text2, os.path.join(folder, key + "_k.mp3")))
            elif vid == "dahai":
                text = pick(DAHAI, key).format(c=label)
                jobs.append(one(sem, voice, rate, pitch, text, os.path.join(folder, key + ".mp3")))
            elif vid == "dia":
                text = pick(DIA, key).format(c=label)
                jobs.append(one(sem, voice, rate, pitch, text, os.path.join(folder, key + ".mp3")))
            elif vid == "loli":
                text = pick(LOLI, key).format(c=label)
                jobs.append(one(sem, voice, rate, pitch, text, os.path.join(folder, key + ".mp3")))
            elif vid == "yujie":
                text = pick(YUJIE, key).format(c=label)
                jobs.append(one(sem, voice, rate, pitch, text, os.path.join(folder, key + ".mp3")))
            elif vid == "dashu":
                text = pick(DASHU, key).format(c=label)
                jobs.append(one(sem, voice, rate, pitch, text, os.path.join(folder, key + ".mp3")))
            else:
                text = pick(YOUTH, key).format(c=label)
                jobs.append(one(sem, voice, rate, pitch, text, os.path.join(folder, key + ".mp3")))
        extras = {
            "yujie": [
                ("preview", "我是御姐音。出牌我会报给你听。"),
                ("pass", "不出。"),
                ("kill", "杀掉。"),
                ("trump_hk", "亮黑桃主。"),
                ("trump_ht", "亮红桃主。"),
                ("trump_mh", "亮梅花主。"),
                ("trump_fk", "亮方块主。"),
                ("trump_none", "亮无主。"),
            ],
            "loli": [
                ("preview", "我是萝莉音哦，出牌我会喊给你听哦。"),
                ("pass", "不出啦。"),
                ("kill", "杀掉！"),
                ("trump_hk", "亮黑桃主哦。"),
                ("trump_ht", "亮红桃主哦。"),
                ("trump_mh", "亮梅花主哦。"),
                ("trump_fk", "亮方块主哦。"),
                ("trump_none", "亮无主啦。"),
            ],
            "dia": [
                ("preview", "人家是嗲嗲音呀，出牌会软软报给你听。"),
                ("pass", "不出嘛。"),
                ("kill", "杀掉人家啦。"),
                ("trump_hk", "亮黑桃主嘛。"),
                ("trump_ht", "亮红桃主呀。"),
                ("trump_mh", "亮梅花主哦。"),
                ("trump_fk", "亮方块主嘛。"),
                ("trump_none", "亮无主呀。"),
            ],
            "dahai": [
                ("preview", "嗯……叫大海。今晚把你弄到腿软，出牌我会浪给你听。"),
                ("pass", "不出……先含着。"),
                ("kill", "嗯啊……杀掉。"),
                ("trump_hk", "嗯……亮黑桃主。"),
                ("trump_ht", "哈……亮红桃主。"),
                ("trump_mh", "嗯……亮梅花主。"),
                ("trump_fk", "含住……亮方块主。"),
                ("trump_none", "亮无主……随便你。"),
            ],
            "jieliu": [
                ("preview", "街溜子来了啊！报牌全他妈带脏字，接不住就滚一边去！"),
                ("pass", "不出你妈的！"),
                ("pass2", "过你妈逼，怂了！"),
                ("pass3", "不出？阳痿啊！"),
                ("pass4", "这把先放过你，下把弄死你！"),
                ("pass5", "过，垃圾牌懒得跟！"),
                ("pass6", "不出，你牛逼你出！"),
                ("kill", "杀！毙了你！"),
                ("trump_hk", "操，亮黑桃主了！这门花色管你们！"),
                ("trump_ht", "我靠亮红桃主，接着啊废物！"),
                ("trump_mh", "梅花主定了，谁不服谁上来！"),
                ("trump_fk", "方块主，砸死你们这帮怂货！"),
                ("trump_none", "无主！今儿谁也别想拿主压人！"),
                ("taunt1", "接啊，怂货！"),
                ("taunt2", "就这？回家练练！"),
                ("taunt3", "哈，被我打懵了吧！"),
                ("taunt4", "接着啊你丫的！"),
                ("taunt5", "整死你没商量！"),
                ("taunt6", "牌都不会出，滚一边去！"),
                ("taunt7", "操，这把我赢定了！"),
                ("taunt8", "别装死，出啊！"),
            ],
            "dashu": [
                ("preview", "大叔音，出牌报给你听。"),
                ("pass", "不出。"),
                ("kill", "杀掉。"),
                ("trump_hk", "亮黑桃主。"),
                ("trump_ht", "亮红桃主。"),
                ("trump_mh", "亮梅花主。"),
                ("trump_fk", "亮方块主。"),
                ("trump_none", "亮无主。"),
            ],
            "youth": [
                ("preview", "青年音，走起。"),
                ("pass", "不出。"),
                ("kill", "杀！"),
                ("trump_hk", "亮黑桃主，走起。"),
                ("trump_ht", "亮红桃主。"),
                ("trump_mh", "亮梅花主。"),
                ("trump_fk", "亮方块主。"),
                ("trump_none", "亮无主。"),
            ],
        }
        for name, text in extras[vid]:
            jobs.append(one(sem, voice, rate, pitch, text, os.path.join(folder, name + ".mp3")))
    await asyncio.gather(*jobs)
    print("done", len(jobs), flush=True)

if __name__ == "__main__":
    asyncio.run(main())

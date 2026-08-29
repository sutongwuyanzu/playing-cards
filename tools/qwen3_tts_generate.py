"""Generate Night Hall persona lines with a local Qwen3-TTS CustomVoice model.

The script intentionally writes WAV files because browsers play them without a
transcoding dependency. It expects the model to be available locally and does
not download anything.
"""

from pathlib import Path

import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel


MODEL_PATH = Path(r"E:\Models\Qwen3-TTS-12Hz-1.7B")
OUTPUT_ROOT = Path(__file__).resolve().parents[1] / "assets" / "tts"

VOICES = {
    "dashu": ("Uncle_Fu", "沉稳、自然，像熟悉牌局的邻桌大哥，近讲感，句尾收住。", {
        "bid": ["我先看看牌。", "这把稳一点。", "三分，接住。"],
        "play": ["轮到我了。", "这张先走。", "慢慢来。"],
        "pass": ["这轮不跟。", "先让一手。"],
        "win": ["牌路清楚，赢得自然。", "这局收下了。"],
        "lose": ["好牌，下一局再来。", "输得明白。"],
    }),
    "yujie": ("Serena", "清晰柔和、克制从容的中文女声，吐字利落，带一点若有若无的笑意。", {
        "bid": ["我看到了。", "这一手不错。", "三分，请。"],
        "play": ["该我出牌了。", "别急，慢慢看。", "这一张。"],
        "pass": ["这一轮先过。", "我再看看。"],
        "win": ["谢谢，让我赢得漂亮。", "这局我收下了。"],
        "lose": ["恭喜，打得很好。", "下一局见。"],
    }),
    "youth": ("Dylan", "自然明亮的青年男声，语速中等，带轻微笑意和清楚的重音。", {
        "bid": ["我来试试。", "这牌能打。", "跟一分。"],
        "play": ["看我的。", "先出这张。", "到我啦。"],
        "pass": ["这轮先不出。", "留点后手。"],
        "win": ["漂亮！这把赢了。", "手感来了。"],
        "lose": ["差一点，再来。", "这局学到了。"],
    }),
    "loli": ("Vivian", "明亮轻盈的少女中文声，清晰不尖，短句轻快，带一点俏皮。", {
        "bid": ["我来啦。"], "play": ["轮到我咯。"], "pass": ["这次先不要。"],
        "win": ["赢啦。"], "lose": ["下次一定。"],
    }),
    "dia": ("Serena", "柔软甜润的中文女声，近距离说话感，语气温柔，尾音略带笑意。", {
        "bid": ["我看一下哦。"], "play": ["这一张，好吗？"], "pass": ["先不跟啦。"],
        "win": ["运气真好。"], "lose": ["没关系，再来。"],
    }),
    "dahai": ("Uncle_Fu", "宽厚低沉的中文男声，气息自然，慢速开阔，像在牌桌边聊天。", {
        "bid": ["稳住。"], "play": ["海里走一张。"], "pass": ["这轮放过。"],
        "win": ["漂亮收官。"], "lose": ["输赢正常。"],
    }),
    "jieliu": ("Eric", "干脆、有颗粒感的中文男声，略带沙哑，节奏明快，轻微调侃但不过分冒犯。", {
        "bid": ["来，接着。"], "play": ["看好了。"], "pass": ["先让你。"],
        "win": ["就这水平？"], "lose": ["算你走运。"],
    }),
}


def main() -> None:
    if not MODEL_PATH.joinpath("model.safetensors").exists():
        raise SystemExit(f"Qwen3-TTS model not found: {MODEL_PATH}")

    model = Qwen3TTSModel.from_pretrained(
        str(MODEL_PATH), device_map="cuda:0", dtype=torch.bfloat16
    )
    for voice_id, (speaker, instruct, groups) in VOICES.items():
        target = OUTPUT_ROOT / voice_id
        target.mkdir(parents=True, exist_ok=True)
        for kind, lines in groups.items():
            wavs, sample_rate = model.generate_custom_voice(
                text=lines,
                language="Chinese",
                speaker=speaker,
                instruct=instruct,
            )
            for index, wav in enumerate(wavs, 1):
                sf.write(target / f"line_{kind}_{index}.wav", wav, sample_rate)
                print(voice_id, kind, index, sample_rate, len(wav))


if __name__ == "__main__":
    main()

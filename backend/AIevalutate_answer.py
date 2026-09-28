import requests

MODEL = "openai/gpt-4.1-mini"
API_KEY = ""
REFINE_INSTRUCTIONS = """
The following prompt is not clear enough for a LLM model, give calrification questions in order to clarify what does the user actually want to do.
List out 5 questions
"""
GENERAL_INSTRUCTIONS = """
Help me with the following prompt
"""

RUBRIC = [
    "completely unclear",  # 0
    "unclear",  # 1
    "Moderate",  # 2
    "clear",  # 3
    "really clear",  # 4
]


def score_prompt(prompt: str, api_key: str) -> dict:
    response = requests.post(
        "https://openrouter.ai/api/alpha/decisions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": "typesafe/jev-1.13",
            "state": prompt,
            "questions": {
                "clarity": {
                    "type": "score",
                    "instructions": "Is this a clear prompt for LLM model",
                    "criteria": RUBRIC,
                }
            },
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["answers"]["clarity"]


def gpt_prompt(prompt: str, instructions: str) -> str:
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {API_KEY.strip()}",
            "Content-Type": "application/json",
        },
        json={
            "model": MODEL,
            "messages": [
                {"role": "system", "content": instructions},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": 500,
        },
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    if "error" in data:
        raise RuntimeError(f"OpenRouter error: {data['error']}")

    answer = data["choices"][0]["message"].get("content")
    if not answer:
        raise RuntimeError("GPT returned no text. Try again.")

    return answer


if __name__ == "__main__":
    key = API_KEY
    score = 0
    while True:
        question = input("enter the question:")
        result = score_prompt(question, key)

        score = result["score"]
        nearest_level = min(4, max(0, int(score + 0.5)))

        print(f"{RUBRIC[nearest_level]}: {score:.1f} / 4")
        # print("\nProbability distribution:")

        # for index, label in enumerate(RUBRIC):
        #     probability = result["probabilities"][str(index)]
        #     print(f"{index} — {label}: {probability:.0%}")

        if score < 3:  # need carification question
            print(
                "The question is not clear enough, please answer some of these questions to make the question clearer."
            )
            print(gpt_prompt(question, REFINE_INSTRUCTIONS))
        else:  # send the prompt to gpt
            print("\n" + gpt_prompt(question, GENERAL_INSTRUCTIONS))
            break

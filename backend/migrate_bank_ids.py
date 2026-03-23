import json, uuid, os

def update_bank():
    bank_path = 'app/question_bank.json'
    if not os.path.exists(bank_path):
        print(f"Error: {bank_path} not found")
        return
        
    with open(bank_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    updated = False
    for q in data:
        if 'q_id' not in q:
            # Use random prefix + existing properties to ensure uniqueness if possible
            q['q_id'] = str(uuid.uuid4())[:8]
            updated = True
            
    if updated:
        with open(bank_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print("Updated bank with unique question IDs")
    else:
        print("Bank already has question IDs")

if __name__ == "__main__":
    update_bank()

import requests
import json

test_cases = [
    ('cloud-fintech-core', 'cloud_api_gw', 'stripe_settlement_bridge'),
    ('defense-aerospace-corp', 'supplier_ext_portal', 'cryptographic_key_hsm'),
    ('healthcare-hospital-system', 'patient_telehealth_portal', 'icu_infusion_pumps'),
    ('small-branch-bank', 'branch_vpn_gateway', 'atm_controller'),
    ('legacy-iot-bank', 'unpatched_exchange', 'mainframe_terminal')
]

for net_id, entry, target in test_cases:
    print(f"Testing {net_id} ({entry} -> {target})...")
    r = requests.post('http://127.0.0.1:8000/simulate', json={
        'network_id': net_id,
        'entry_node': entry,
        'target_node': target,
        'algorithm': 'pignn',
        'weighting_mode': 'dwm'
    }, stream=True)
    assert r.status_code == 200, f'Status {r.status_code}'
    found_path = False
    tokens = []
    for line in r.iter_lines():
        if not line:
            continue
        decoded = line.decode('utf-8')
        if decoded.startswith('data: '):
            payload = decoded[6:].strip()
            if payload == '[DONE]':
                break
            try:
                data = json.loads(payload)
                if data.get('type') == 'path':
                    found_path = True
                    print('  Path found:', [n['id'] for n in data['data'][0]['nodes']])
                elif data.get('type') == 'token':
                    tokens.append(data['data'])
            except Exception as e:
                pass
    full_text = "".join(tokens)
    print(f"  Tokens: {len(tokens)}, narrative length: {len(full_text)}")
    print("  First 120 chars:", repr(full_text[:120]))
    print("-" * 50)

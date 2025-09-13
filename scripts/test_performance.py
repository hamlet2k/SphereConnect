import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))

from api.src.wingman_skill_poc import WingmanSkill
import time

print('Running Wingman-AI Skill Performance Test...')
print('=' * 50)

skill = WingmanSkill()
test_commands = [
    'Create objective: Collect 500 SCU Gold',
    'Assign task Scout Route to Pilot X',
    'Delivered 100 SCU Gold',
    'Schedule task for 20 minutes now'
]

latencies = []
accuracies = []

for i, command in enumerate(test_commands):
    print(f'Test {i+1}: {command}')

    start_time = time.time()
    result = skill.handle_voice_command(command)
    end_time = time.time()

    latency = end_time - start_time
    latencies.append(latency)

    print('.3f')

    has_response = 'response' in result and result['response']
    accuracies.append(1 if has_response else 0)

    response_text = result.get('response', 'No response')
    print(f'  Response: {response_text[:50]}...')
    print()

avg_latency = sum(latencies) / len(latencies)
max_latency = max(latencies)
accuracy = (sum(accuracies) / len(accuracies)) * 100

print('Performance Results:')
print('.3f')
print('.3f')
print('.1f')

latency_ok = avg_latency < 2.0 and max_latency < 2.0
accuracy_ok = accuracy >= 90.0

print('\nRequirements Check:')
print(f'  Latency < 2s: {"✓" if latency_ok else "✗"}')
print(f'  Accuracy >= 90%: {"✓" if accuracy_ok else "✗"}')

if latency_ok and accuracy_ok:
    print('\n🎉 All requirements met!')
else:
    print('\n⚠️ Some requirements not met')

print('\nSample Voice Commands Tested:')
for cmd in test_commands:
    print(f'  - "{cmd}"')

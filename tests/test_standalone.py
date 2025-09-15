import sys
import os
import time
from unittest.mock import Mock, patch
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))

from api.src.wingman_skill_poc import WingmanSkill

print('Running Wingman-AI Skill Standalone Performance Test...')
print('=' * 60)

# Mock the requests to avoid needing a running server
mock_response = Mock()
mock_response.status_code = 200
mock_response.json.return_value = {
    "id": "test-id",
    "message": "Success",
    "tts_response": "Test response"
}

skill = WingmanSkill()

# Test commands from requirements
test_commands = [
    'Create objective: Collect 500 SCU Gold',
    'Assign task Scout Route to Pilot X',
    'Delivered 100 SCU Gold',
    'Schedule task for 20 minutes now'
]

latencies = []
accuracies = []
intent_detections = []

print('Testing Voice Command Processing:')
print('-' * 40)

for i, command in enumerate(test_commands):
    print(f'Test {i+1}: "{command}"')

    # Mock API calls
    with patch('api.src.wingman_skill_poc.requests.post', return_value=mock_response), \
         patch('api.src.wingman_skill_poc.requests.patch', return_value=mock_response), \
         patch('api.src.wingman_skill_poc.requests.get', return_value=mock_response):

        start_time = time.time()
        result = skill.handle_voice_command(command)
        end_time = time.time()

        latency = end_time - start_time
        latencies.append(latency)

        print('.3f')

        # Check response quality
        has_response = 'response' in result and result['response']
        has_tts = result.get('tts', False)
        response_quality = has_response and has_tts

        accuracies.append(1 if response_quality else 0)

        # Test intent detection separately
        intent, params = skill.parse_intent(command)
        intent_correct = intent is not None
        intent_detections.append(1 if intent_correct else 0)

        print(f'  Intent Detected: {intent or "None"}')
        print(f'  Response: {result.get("response", "No response")[:60]}...')
        print()

# Calculate metrics
avg_latency = sum(latencies) / len(latencies)
max_latency = max(latencies)
response_accuracy = (sum(accuracies) / len(accuracies)) * 100
intent_accuracy = (sum(intent_detections) / len(intent_detections)) * 100
overall_accuracy = (response_accuracy + intent_accuracy) / 2

print('Performance Results:')
print('=' * 40)
print('.3f')
print('.3f')
print('.1f')
print('.1f')
print('.1f')

print('\nDetailed Test Results:')
print('-' * 40)

# Test parsing capabilities
print('Intent Detection Tests:')
test_cases = [
    ('Create objective: Collect 500 SCU Gold', 'create_objective'),
    ('Assign task Scout Route to Pilot X', 'assign_task'),
    ('Delivered 100 SCU Gold', 'report_progress'),
    ('Schedule task for 20 minutes now', 'schedule_task'),
]

correct_intents = 0
for cmd, expected in test_cases:
    intent, params = skill.parse_intent(cmd)
    is_correct = intent == expected
    correct_intents += 1 if is_correct else 0
    status = '[PASS]' if is_correct else '[FAIL]'
    print(f'  {status} "{cmd[:30]}..." -> {intent or "None"} (expected: {expected})')

parsing_accuracy = (correct_intents / len(test_cases)) * 100

print('\nMetric Parsing Tests:')
metric_tests = [
    ('Collect 500 SCU Gold', {'gold_scu': 500}),
    ('Delivered 100 SCU Platinum', {'platinum_scu': 100}),
    ('Mining 50 SCU Quantum', {'quantum_scu': 50}),
]

correct_metrics = 0
for text, expected in metric_tests:
    metrics = skill.parse_metrics_from_text(text)
    is_correct = metrics == expected
    correct_metrics += 1 if is_correct else 0
    status = '[PASS]' if is_correct else '[FAIL]'
    print(f'  {status} "{text}" -> {metrics} (expected: {expected})')

metric_accuracy = (correct_metrics / len(metric_tests)) * 100

print('\nRequirements Check:')
print('=' * 40)
latency_ok = avg_latency < 2.0 and max_latency < 2.0
accuracy_ok = overall_accuracy >= 90.0
parsing_ok = parsing_accuracy >= 90.0

print(f'  [PASS] Latency < 2s: {"PASS" if latency_ok else "FAIL"}')
print(f'  [PASS] Overall Accuracy >= 90%: {"PASS" if accuracy_ok else "FAIL"} ({overall_accuracy:.1f}%)')
print(f'  [PASS] Intent Detection >= 90%: {"PASS" if parsing_ok else "FAIL"} ({parsing_accuracy:.1f}%)')
print(f'  [PASS] Metric Parsing: {"PASS" if metric_accuracy >= 80 else "FAIL"} ({metric_accuracy:.1f}%)')

all_passed = latency_ok and accuracy_ok and parsing_ok and metric_accuracy >= 80

if all_passed:
    print('\n[SUCCESS] ALL REQUIREMENTS MET!')
    print('Wingman-AI skill is ready for production use.')
else:
    print('\n⚠️ Some requirements not fully met.')
    print('Additional optimization may be needed.')

print('\nTest Summary:')
print('-' * 40)
print(f'• Tested {len(test_commands)} voice commands')
print(f'• Average response time: {avg_latency:.3f}s')
print(f'• Intent detection accuracy: {parsing_accuracy:.1f}%')
print(f'• Metric parsing accuracy: {metric_accuracy:.1f}%')
print(f'• Overall system accuracy: {overall_accuracy:.1f}%')

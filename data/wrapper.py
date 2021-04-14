from power_api import SixfabPower
from flask import Flask, jsonify
import time

api = SixfabPower()

def empty():
  time.sleep(1)
  return

def check_loop(fn):
  print("call starting")
  i = 0
  while i < 10:
    i += 1
    try:
      result = fn(100)
      return result
    except:
      empty()
  return -1

def get_input_temp():
  return check_loop(lambda time: api.get_input_temp(time))

def get_input_voltage():
  return check_loop(lambda time: api.get_input_voltage(time))

def get_input_current():
  return check_loop(lambda time: api.get_input_current(time))

def get_input_power():
  return check_loop(lambda time: api.get_input_power(time))

def get_system_temp():
  return check_loop(lambda time: api.get_system_temp(time))

def get_system_voltage():
  return check_loop(lambda time: api.get_system_voltage(time))

def get_system_current():
  return check_loop(lambda time: api.get_system_current(time))

def get_system_power():
  return check_loop(lambda time: api.get_system_power(time))

def get_battery_temp():
  return check_loop(lambda time: api.get_battery_temp(time))

def get_battery_voltage():
  return check_loop(lambda time: api.get_battery_voltage(time))

def get_battery_current():
  return check_loop(lambda time: api.get_battery_current(time))

def get_battery_power():
  return check_loop(lambda time: api.get_battery_power(time))

def get_battery_level():
  return check_loop(lambda time: api.get_battery_level(time))

def get_battery_health():
  return check_loop(lambda time: api.get_battery_health(time))

def get_fan_health():
  return check_loop(lambda time: api.get_fan_health(time))

def get_fan_speed():
  return check_loop(lambda time: api.get_fan_speed(time))

app = Flask(__name__)

@app.route('/report', methods=['GET'])
def get_tasks():
  return jsonify({
    "input": {
      "temp": get_input_temp(),
      "voltage": get_input_voltage(),
      "current": get_input_current(),
      "power": get_input_power()
    },
    "system": {
      "temp": get_system_temp(),
      "voltage": get_system_voltage(),
      "current": get_system_current(),
      "power": get_system_power()
    },
    "battery": {
      "temp": get_battery_temp(),
      "voltage": get_battery_voltage(),
      "current": get_battery_current(),
      "power": get_battery_power(),
      "level": get_battery_level(),
      "health": get_battery_health()
    },
    "fan": {
        'health': get_fan_health(),
        'speed': get_fan_speed()
    }
  })

if __name__ == '__main__':
    app.run(debug=True)
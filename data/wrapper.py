from power_api import SixfabPower
import json
import requests
import time

def empty():
  time.sleep(1)
  return

def check_loop(fn):
  print("call starting")
  i = 0
  while i < 2:
    i += 1
    try:
      result = fn(50)
      return result
    except:
      empty()
  return -999

def get_input_temp(api):
  return check_loop(lambda time: api.get_input_temp(time))

def get_input_voltage(api):
  return check_loop(lambda time: api.get_input_voltage(time))

def get_input_current(api):
  return check_loop(lambda time: api.get_input_current(time))

def get_input_power(api):
  return check_loop(lambda time: api.get_input_power(time))

def get_system_temp(api):
  return check_loop(lambda time: api.get_system_temp(time))

def get_system_voltage(api):
  return check_loop(lambda time: api.get_system_voltage(time))

def get_system_current(api):
  return check_loop(lambda time: api.get_system_current(time))

def get_system_power(api):
  return check_loop(lambda time: api.get_system_power(time))

def get_battery_temp(api):
  return check_loop(lambda time: api.get_battery_temp(time))

def get_battery_voltage(api):
  return check_loop(lambda time: api.get_battery_voltage(time))

def get_battery_current(api):
  return check_loop(lambda time: api.get_battery_current(time))

def get_battery_power(api):
  return check_loop(lambda time: api.get_battery_power(time))

def get_battery_level(api):
  return check_loop(lambda time: api.get_battery_level(time))

def get_battery_health(api):
  return check_loop(lambda time: api.get_battery_health(time))

def get_fan_health(api):
  return check_loop(lambda time: api.get_fan_health(time))

def get_fan_speed(api):
  return check_loop(lambda time: api.get_fan_speed(time))

def get_diagnostic():
  api = SixfabPower()
  return {
    "input": {
      "temp": get_input_temp(api),
      "voltage": get_input_voltage(api),
      "current": get_input_current(api),
      "power": get_input_power(api)
    },
    "system": {
      #"temp": get_system_temp(api),
      "voltage": get_system_voltage(api),
      "current": get_system_current(api),
      "power": get_system_power(api)
    },
    "battery": {
      "temp": get_battery_temp(api),
      "voltage": get_battery_voltage(api),
      "current": get_battery_current(api),
      "power": get_battery_power(api),
      "level": get_battery_level(api),
      "health": get_battery_health(api)
    },
    "fan": {
        'health': get_fan_health(api),
        'speed': get_fan_speed(api)
    }
  }

if __name__ == '__main__':
  while True:
    headers = {'Accept' : 'application/json', 'Content-Type' : 'application/json'}

    requests.post('http://127.0.0.1/api/v2/diagnostic.json', json=get_diagnostic(), headers=headers)

    #check if task is done
    time.sleep(60)
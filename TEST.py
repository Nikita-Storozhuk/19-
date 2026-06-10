import hashlib

print(hashlib.sha256('password'.encode()).hexdigest())
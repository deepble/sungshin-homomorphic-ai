import tenseal as ts
import json

def create_context():
    context = ts.context(
        ts.SCHEME_TYPE.BFV,
        poly_modulus_degree=8192,
        plain_modulus=1032193
    )
    context.generate_galois_keys()
    context.generate_relin_keys()
    return context

def encrypt_vector(context, vector):
    return ts.bfv_vector(context, vector)

def load_weights():
    with open("weights.json") as f:
        return json.load(f)

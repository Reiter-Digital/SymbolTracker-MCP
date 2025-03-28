"""
This is a sample Python module for testing the parser.

It includes various Python constructs.
"""

import os

# --- Functions ---

def public_function(param1: str, param2: int = 0) -> bool:
    """
    This is a public function.

    Args:
        param1: The first parameter.
        param2: The second parameter (optional).

    Returns:
        Always returns True.
    """
    print(f"Called with {param1} and {param2}")
    return True

def _private_function():
    """A private function."""
    print("This should not be marked as exported.")
    return None

# --- Classes ---

class MyClass:
    """
    A sample class for testing.

    Attributes:
        name (str): The name of the instance.
    """

    def __init__(self, name: str):
        """Initialize MyClass."""
        self.name = name
        self._protected_var = "secret"
        self.__private_var = 123

    def public_method(self, value: int):
        """A public method."""
        print(f"{self.name} received value: {value}")

    def _protected_method(self):
        """A protected method."""
        print("Accessing protected stuff:", self._protected_var)

    def __private_method(self):
        """A private method."""
        print("Accessing private stuff:", self.__private_var)

# --- Routes (Simulated) ---

# Mock Flask/FastAPI app object
class MockApp:
    def route(self, path, methods=['GET']):
        def decorator(func):
            # In a real app, this would register the route
            print(f"Registering route: {methods} {path} -> {func.__name__}")
            return func
        return decorator

    def get(self, path):
        return self.route(path, methods=['GET'])

app = MockApp()

@app.route('/home')
def home_page():
    """Serves the home page."""
    return "<h1>Welcome Home!</h1>"

@app.get('/api/items/{item_id}')
def get_item(item_id: int):
    """
    Gets an item by its ID.

    Args:
        item_id: The ID of the item to retrieve.

    Returns:
        A dictionary representing the item.
    """
    return {"item_id": item_id, "name": f"Item {item_id}"}

# --- Final Check ---

if __name__ == "__main__":
    print("Running test sample...")
    public_function("test", 1)
    _private_function()
    instance = MyClass("TestInstance")
    instance.public_method(100)
    instance._protected_method()
    # instance.__private_method() # This would raise an AttributeError if called directly
    print(home_page())
    print(get_item(42))

"""Real HTTP integration tests against an isolated temporary SQLite database."""
import json
import os
from pathlib import Path
import socket
import tempfile
import threading
import time
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen


class BoardTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        cls.base = f"http://127.0.0.1:{port}/api/v1"
        os.environ["DATABASE_URL"] = f"sqlite:///{Path(cls.temp.name) / 'test.db'}"
        os.environ["JWT_SECRET_KEY"] = "board-integration-test-only"
        import uvicorn
        from app.main import app
        cls.server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error"))
        cls.thread = threading.Thread(target=cls.server.run, daemon=True)
        cls.thread.start()
        for _ in range(100):
            try:
                with urlopen(cls.base + "/posts", timeout=1):
                    return
            except OSError:
                time.sleep(.1)
        cls.tearDownClass()
        raise RuntimeError("Test server failed to start")

    @classmethod
    def tearDownClass(cls):
        cls.server.should_exit = True
        cls.thread.join(timeout=10)
        from app.db import engine
        engine.dispose()
        cls.temp.cleanup()

    def request(self, method, path, payload=None, token=None):
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        request = Request(self.base + path, data=json.dumps(payload).encode() if payload is not None else None, headers=headers, method=method)
        try:
            response = urlopen(request, timeout=5)
        except HTTPError as error:
            response = error
        with response:
            return response.status, json.loads(response.read())

    def test_board_lifecycle_and_permissions(self):
        status, empty = self.request("GET", "/posts")
        self.assertEqual(status, 200)
        self.assertEqual(empty["total"], 0)
        tokens = []
        for name in ["author", "other"]:
            status, auth = self.request("POST", "/auth/signup", {"email": f"{name}@example.com", "password": "password123", "display_name": name})
            self.assertEqual(status, 201, auth)
            tokens.append(auth["access_token"])
        author, other = tokens
        payload = {"title": "  hello  ", "content": "  body <script>alert(1)</script>  "}
        self.assertEqual(self.request("POST", "/posts", payload)[0], 401)
        self.assertEqual(self.request("POST", "/posts", payload, "invalid")[0], 401)
        for invalid in [{"title": " ", "content": "body"}, {"title": "a" * 201, "content": "b"}, {"title": "a", "content": "b" * 10001}, {**payload, "author_id": 999}]:
            self.assertEqual(self.request("POST", "/posts", invalid, author)[0], 422)
        status, post = self.request("POST", "/posts", payload, author)
        self.assertEqual(status, 201)
        self.assertEqual(post["title"], "hello")
        self.assertNotIn("email", post["author"])
        path = f'/posts/{post["id"]}'
        status, viewed = self.request("GET", path)
        self.assertEqual(status, 200)
        self.assertEqual(viewed["view_count"], 1)
        self.assertEqual(viewed["updated_at"], post["updated_at"])
        for method in ["PUT", "DELETE"]:
            body = payload if method == "PUT" else None
            self.assertEqual(self.request(method, path, body)[0], 401)
            self.assertEqual(self.request(method, path, body, other)[0], 403)
        self.assertEqual(self.request("PUT", path, {"title": "updated", "content": "needle"}, author)[0], 200)
        comment_path = path + "/comments"
        self.assertEqual(self.request("GET", comment_path), (200, []))
        self.assertEqual(self.request("POST", comment_path, {"content": "c"})[0], 401)
        self.assertEqual(self.request("POST", comment_path, {"content": " "}, author)[0], 422)
        self.assertEqual(self.request("POST", comment_path, {"content": "c" * 2001}, author)[0], 422)
        status, comment = self.request("POST", comment_path, {"content": " comment "}, author)
        self.assertEqual(status, 201)
        self.assertEqual(comment["content"], "comment")
        cp = f'/comments/{comment["id"]}'
        for method in ["PUT", "DELETE"]:
            body = {"content": "hacked"} if method == "PUT" else None
            self.assertEqual(self.request(method, cp, body)[0], 401)
            self.assertEqual(self.request(method, cp, body, other)[0], 403)
        self.assertEqual(self.request("PUT", cp, {"content": "edited"}, author)[1]["content"], "edited")
        self.assertEqual(self.request("GET", "/posts")[1]["items"][0]["comment_count"], 1)
        self.assertEqual(self.request("DELETE", cp, token=author)[0], 200)
        self.assertEqual(self.request("GET", "/posts")[1]["items"][0]["comment_count"], 0)
        for title in ["second", "third"]:
            self.assertEqual(self.request("POST", "/posts", {"title": title, "content": "body"}, author)[0], 201)
        first_page = self.request("GET", "/posts?page=1&size=2")[1]
        second_page = self.request("GET", "/posts?page=2&size=2")[1]
        self.assertEqual((first_page["total"], first_page["total_pages"]), (3, 2))
        self.assertEqual([p["title"] for p in first_page["items"]], ["third", "second"])
        self.assertEqual(len(second_page["items"]), 1)
        for search in ["needle", "updated"]:
            self.assertEqual(self.request("GET", f"/posts?search={search}")[1]["total"], 1)
        for search in ["missing", "%25", "%27%20OR%201%3D1--"]:
            self.assertEqual(self.request("GET", f"/posts?search={search}")[1]["total"], 0)
        for query in ["page=0", "size=101"]:
            self.assertEqual(self.request("GET", f"/posts?{query}")[0], 422)
        _, cascade = self.request("POST", comment_path, {"content": "cascade"}, other)
        self.assertEqual(self.request("DELETE", path, token=author)[0], 200)
        for method, url, body in [("GET", path, None), ("GET", comment_path, None), ("POST", comment_path, {"content": "no"}), ("PUT", path, payload), ("DELETE", path, None), ("PUT", f'/comments/{cascade["id"]}', {"content": "no"})]:
            self.assertEqual(self.request(method, url, body, author)[0], 404)


if __name__ == "__main__":
    unittest.main()

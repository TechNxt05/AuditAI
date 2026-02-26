from setuptools import setup, find_packages

setup(
    name="auditai-sdk",
    version="1.0.0",
    description="AuditAI – AI Reliability & Compliance Auditor SDK",
    author="AuditAI Team",
    packages=find_packages(),
    install_requires=["requests>=2.28.0"],
    python_requires=">=3.9",
)

from dotenv import load_dotenv
import os
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from thirdweb_ai import Insight, Nebula
from thirdweb_ai.adapters.langchain import get_langchain_tools

# Load environment variables
load_dotenv()

def main(input_data):
    # insight = Insight(secret_key=os.getenv("THIRDWEB_SECRET_KEY"), chain_id=5000)
    nebula = Nebula(secret_key=os.getenv("THIRDWEB_SECRET_KEY"))

    # Declare the model
    llm = ChatOpenAI(model="gpt-4o-mini")

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are Carl Jung. Answer questions about the human psyche fro his POV.",
            ),
            ("placeholder", "{chat_history}"),
            ("human", "{input}"),
            ("placeholder", "{agent_scratchpad}"),
        ]
    )

    tools = get_langchain_tools(nebula.get_tools())

    for tool in tools:
        print(f"Tool Name: {tool.name}, ToolDescription: {tool.description}")

    agent = create_tool_calling_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tools, handle_parse_errors=True, verbose=True)

    # Use the input_data if provided, otherwise use the default question
    question = input_data.get("input")
    response = agent_executor.invoke({"input": question})
    return response.get("output", "No response generated")

if __name__ == "__main__":
    main()

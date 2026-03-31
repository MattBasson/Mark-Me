from langgraph.graph import END, StateGraph

from agents.graph.nodes import ingestion_node, marking_node, review_node
from agents.schemas.state import MarkingState


def route_after_ingestion(state: MarkingState) -> str:
    if not state.get("ingestion_ok", True):
        return "abort"
    return "marking"


def build_graph():
    graph = StateGraph(MarkingState)

    graph.add_node("ingestion", ingestion_node)
    graph.add_node("marking", marking_node)
    graph.add_node("review", review_node)

    graph.set_entry_point("ingestion")
    graph.add_conditional_edges(
        "ingestion",
        route_after_ingestion,
        {"marking": "marking", "abort": END},
    )
    graph.add_edge("marking", "review")
    graph.add_edge("review", END)

    return graph.compile()


compiled_graph = build_graph()


async def run_graph(
    submission_id: str, assignment_id: str, page_image_paths: list[str]
):
    """Async generator that yields SSE event dicts as the graph executes."""
    initial_state: MarkingState = {
        "submission_id": submission_id,
        "assignment_id": assignment_id,
        "page_image_paths": page_image_paths,
        "sse_events": [],
    }
    async for node_output in compiled_graph.astream(
        initial_state, stream_mode="updates"
    ):
        for _node_name, state_slice in node_output.items():
            for event in state_slice.get("sse_events", []):
                yield event

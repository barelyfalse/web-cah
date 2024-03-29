window.addEventListener('resize', setSelectionZoneWidth);
document.addEventListener('click', handleDocumentTap)
selectionZoneEl.addEventListener('touchstart', handleTouchTapStart);
selectionZoneEl.addEventListener('touchmove', handleSelectionPointerMove);
selectionZoneEl.addEventListener('touchend', handleSelectionPointerUp);
selectionZoneEl.addEventListener('mousemove', handleSelectionPointerMove);
selectionZoneEl.addEventListener('mouseup', handleSelectionPointerUp);
selectionZoneEl.addEventListener('mouseleave', handleSelectionPointerLeave)
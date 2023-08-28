window.addEventListener('resize', setSelectionZoneWidth);
selectionZoneEl.addEventListener('mousemove', handleSelectionPointerMove);
selectionZoneEl.addEventListener('touchmove', handleSelectionPointerMove);
selectionZoneEl.addEventListener('mouseleave', handleSelectionPointerLeave);
selectionZoneEl.addEventListener('touchstart', handleTouchTapStart);
selectionZoneEl.addEventListener('click', handleSelection);
selectionZoneEl.addEventListener('touchend', handleSelection);
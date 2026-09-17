import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useDismiss,
  useRole,
  useClick,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager,
  useTransitionStyles,
} from '@floating-ui/react';

/**
 * Universal Action Menu using Floating UI
 * Renders inside FloatingPortal with strategy="fixed" and autoUpdate to guarantee
 * 100% accurate anchoring to the trigger button without clipping or top-left jumps.
 */
const TableActionMenu = ({
  items = [],
  children,
  trigger,
  placement = 'bottom-end',
  menuWidth = '175px',
  portal = true,
  className = '',
  buttonClassName = 'btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle border shadow-2xs action-btn-hover',
  iconClassName = 'ti ti-dots-vertical fs-15 text-muted',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const validItems = (items || []).filter(Boolean);

  if (validItems.length === 0 && !children) {
    return <span className="text-muted fs-12">-</span>;
  }

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(6),
      flip({
        fallbackPlacements: ['top-end', 'bottom-end', 'top-start', 'bottom-start', 'left-start', 'right-start'],
        padding: 8,
      }),
      shift({ padding: 8 }),
    ],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context, { outsidePressEvent: 'mousedown' });
  const role = useRole(context, { role: 'menu' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
    duration: 120,
    initial: {
      opacity: 0,
      transform: 'scale(0.96)',
    },
    open: {
      opacity: 1,
      transform: 'scale(1)',
    },
    close: {
      opacity: 0,
      transform: 'scale(0.96)',
    },
  });

  const handleItemClick = (e, item) => {
    if (item.disabled) {
      e.preventDefault();
      return;
    }
    if (item.onClick) {
      item.onClick(e);
    }
    setIsOpen(false);
  };

  const renderContent = () => {
    if (children) {
      return typeof children === 'function'
        ? children({ close: () => setIsOpen(false) })
        : children;
    }

    return (
      <ul className="list-unstyled mb-0 py-1" role="menu">
        {validItems.map((item, index) => {
          if (item.divider) {
            return <li key={`divider-${index}`} className="dropdown-divider my-1 border-light" />;
          }

          if (item.header) {
            return (
              <li
                key={`header-${index}`}
                className="dropdown-header text-uppercase text-muted fs-11 fw-bold px-3 py-1"
              >
                {item.header}
              </li>
            );
          }

          const isDanger = item.variant === 'danger';
          const isWarning = item.variant === 'warning';
          const isSuccess = item.variant === 'success';
          const isPrimary = item.variant === 'primary';

          let itemColorClass = 'text-dark';
          if (isDanger) itemColorClass = 'text-danger action-item-danger';
          else if (isWarning) itemColorClass = 'text-warning action-item-warning';
          else if (isSuccess) itemColorClass = 'text-success action-item-success';
          else if (isPrimary) itemColorClass = 'text-primary action-item-primary';

          const content = (
            <span
              className={`d-flex align-items-center gap-2 px-3 py-2 text-decoration-none fs-13 ${itemColorClass} ${
                item.disabled ? 'disabled opacity-50 pe-none' : 'action-menu-item'
              }`}
            >
              {item.icon && (
                <i
                  className={`${item.icon} fs-15 ${
                    isDanger
                      ? 'text-danger'
                      : isWarning
                      ? 'text-warning'
                      : isSuccess
                      ? 'text-success'
                      : isPrimary
                      ? 'text-primary'
                      : 'text-muted'
                  }`}
                ></i>
              )}
              <span className="fw-medium flex-grow-1">{item.label}</span>
            </span>
          );

          if (item.to) {
            return (
              <li key={item.key || index} role="menuitem">
                <Link
                  to={item.to}
                  className="d-block text-decoration-none"
                  onClick={(e) => handleItemClick(e, item)}
                >
                  {content}
                </Link>
              </li>
            );
          }

          return (
            <li key={item.key || index} role="menuitem">
              <button
                type="button"
                className="w-100 text-start border-0 bg-transparent p-0"
                onClick={(e) => handleItemClick(e, item)}
                disabled={item.disabled}
              >
                {content}
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  const menuElement = isMounted && (
    <FloatingFocusManager context={context} modal={false} initialFocus={-1} returnFocus={true}>
      <div
        ref={refs.setFloating}
        style={{
          ...floatingStyles,
          zIndex: 99999,
        }}
        {...getFloatingProps()}
      >
        <div
          style={{
            ...transitionStyles,
            width: menuWidth,
          }}
          className={`floating-action-menu bg-white rounded-3 shadow-lg border ${className}`}
        >
          {renderContent()}
        </div>
      </div>
    </FloatingFocusManager>
  );

  return (
    <div className="table-action-menu-wrapper d-inline-flex align-items-center">
      {trigger && React.isValidElement(trigger) ? (
        React.cloneElement(trigger, {
          ref: refs.setReference,
          ...getReferenceProps(),
          onClick: (e) => {
            if (trigger.props.onClick) trigger.props.onClick(e);
            if (getReferenceProps().onClick) getReferenceProps().onClick(e);
          },
        })
      ) : (
        <button
          ref={refs.setReference}
          {...getReferenceProps()}
          type="button"
          className={buttonClassName}
          title="Actions"
          aria-label="Actions menu"
        >
          {trigger || <i className={iconClassName}></i>}
        </button>
      )}

      {portal ? <FloatingPortal>{menuElement}</FloatingPortal> : menuElement}
    </div>
  );
};

export default TableActionMenu;

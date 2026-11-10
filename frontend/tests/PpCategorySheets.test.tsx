/** @jest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PP_ACTIVITIES } from '../src/data/ppActivities'
import { buildPpTree } from '../src/data/ppRulesUtils'
import { LayoutToggle, PpCategorySheets, readListCollapsed, readListLayout, storeListCollapsed, storeListLayout } from '../src/components/pp/PpCategorySheets'

const tree = buildPpTree(PP_ACTIVITIES)

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('PpCategorySheets', () => {
  it('shows a tab per category and only the chosen category\'s activities', () => {
    render(<PpCategorySheets tree={tree} selected={tree[0].items[0].no} onSelect={() => {}} />)
    expect(screen.getAllByRole('tab')).toHaveLength(tree.length)
    expect(screen.getByRole('tab', { selected: true }).textContent).toContain(tree[0].label)
    expect(screen.getByRole('tabpanel').querySelectorAll('button')).toHaveLength(tree[0].items.length)
  })

  it('shows the detail beside the activity list', () => {
    render(
      <PpCategorySheets tree={tree} selected={tree[0].items[0].no} onSelect={() => {}}>
        <p>รายละเอียด</p>
      </PpCategorySheets>,
    )
    expect(screen.getByText('รายละเอียด')).toBeTruthy()
  })

  it('opens the first activity of a tab that is clicked', () => {
    const onSelect = jest.fn()
    render(<PpCategorySheets tree={tree} selected={tree[0].items[0].no} onSelect={onSelect} />)
    fireEvent.click(screen.getAllByRole('tab')[1])
    expect(onSelect).toHaveBeenCalledWith(tree[1].items[0].no)
  })

  it('follows the selected activity to its category', () => {
    render(<PpCategorySheets tree={tree} selected={tree[1].items[0].no} onSelect={() => {}} />)
    expect(screen.getByRole('tab', { selected: true }).textContent).toContain(tree[1].label)
  })
})

describe('list layout', () => {
  it('defaults to vertical and remembers the choice', () => {
    expect(readListLayout()).toBe('vertical')
    storeListLayout('horizontal')
    expect(readListLayout()).toBe('horizontal')
  })

  it('reports the picked layout', () => {
    const onChange = jest.fn()
    render(<LayoutToggle value="vertical" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'แนวนอน' }))
    expect(onChange).toHaveBeenCalledWith('horizontal')
  })
})

describe('folding the activity list', () => {
  it('folds to a strip and opens again', () => {
    const onCollapse = jest.fn()
    const { rerender } = render(
      <PpCategorySheets tree={tree} selected={tree[0].items[0].no} onSelect={() => {}} onCollapse={onCollapse} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'ย่อรายการกิจกรรม' }))
    expect(onCollapse).toHaveBeenCalledWith(true)
    rerender(<PpCategorySheets tree={tree} selected={tree[0].items[0].no} onSelect={() => {}} collapsed onCollapse={onCollapse} />)
    expect(screen.queryByRole('tabpanel')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'ขยายรายการกิจกรรม' }))
    expect(onCollapse).toHaveBeenCalledWith(false)
  })

  it('remembers the choice', () => {
    expect(readListCollapsed()).toBe(false)
    storeListCollapsed(true)
    expect(readListCollapsed()).toBe(true)
  })
})

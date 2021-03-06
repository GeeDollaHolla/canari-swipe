import React, { Component } from 'react'
import PropTypes from 'prop-types'

/**
 * @extends {Component<{swipeAmount:number, firstSelection:number, desiredSelection:number, desiredSelectionTime:number, vertical:bool, minimumSwipeSpeed:number, carousel:bool, wrapAround:bool, neighborsOnly:bool, visibleCount:number, detent:number, deceleration:number, swipeRatio:number, startSwipeAmount:number, noSelectionWrapper:bool, resetSwiper:bool, overflow:bool, startSwiping:()=>any, updateCurrentSelection:()=>any }>}
 */
class Swiper extends Component {
	constructor(props) {
		super(props)

		this.stopVelocity = 300 // if carousel, then determine what velocity to stopSwiping
		this.selectionCount = this.childCount()
		this.currentSelection = this.props.firstSelection
		this.isTouching = false
		this.isSwiping = false
		this.swipeStart = 0
		this.swipeTimer = 0
		this.swipeVelocity = 0
		this.currentSelectionRef = React.createRef()

		this.state = { swipePosition: this.currentSelection * this.swipeAmount }
	}

	childCount() {
		return React.Children.count(this.props.children)
	}

	setWrapperStyle(swipeAmount) {
		const { vertical, visibleCount, carousel, overflow } = this.props
		const {
			current: { offsetWidth: width, offsetHeight: height },
		} = this.currentSelectionRef

		this.swipeAmount = swipeAmount || (vertical ? height : width)

		this.wrapperStyle = {
			overflow: overflow ? 'visible' : 'hidden',
			position: 'relative',
			display: 'inline-block',
			// border: '1px solid black',
			width: vertical ? width : (carousel ? visibleCount : 1) * this.swipeAmount,
			height: vertical ? (carousel ? visibleCount : 1) * this.swipeAmount : height,
		}

		this.setState({ swipePosition: this.currentSelection * this.swipeAmount })
	}

	handleTouchDown(e) {
		this.handleMouseDown({ pageX: e.targetTouches[0].pageX, pageY: e.targetTouches[0].pageY })
	}

	handleMouseDown(e) {
		const { carousel, vertical } = this.props

		// For neighbors only, only allow swiping if at rest
		if (carousel || !this.isSwiping) {
			this.isTouching = true
			this.swipeStart = vertical ? e.pageY : e.pageX
			this.lastTouchLocation = this.swipeStart
			this.onSwipeSpace = true
		}
	}

	handleMouseUp() {
		this.doneSwiping()
	}

	handleMouseLeave() {
		if (this.isTouching) {
			this.onSwipeSpace = false // signify letting go outside swipe space
			this.doneSwiping()
		}
	}

	doneSwiping() {
		const { wrapAround, detent, carousel, minimumSwipeSpeed } = this.props

		if (this.isSwiping) {
			// If swipe is faster than minimum speed, swipe in that direction
			if (Math.abs(this.swipeVelocity) > minimumSwipeSpeed) {
				this.desiredSelection =
					Math.floor(this.state.swipePosition / this.swipeAmount) + (this.swipeVelocity > 0 ? 1 : 0)
				this.clampDesiredSelection()
				this.currentSelection = this.desiredSelection - Math.sign(this.swipeVelocity)

				// If swipe offset is past 50%, swipe in that direction, else go back to current selection
			} else {
				const goNext =
					(this.state.swipePosition + this.swipeAmount) % this.swipeAmount > this.swipeAmount / 2
				this.desiredSelection =
					Math.floor(this.state.swipePosition / this.swipeAmount) + (goNext ? 1 : 0)
				this.clampDesiredSelection()
				this.currentSelection = this.desiredSelection + (goNext ? -1 : 1)

				if (!carousel || detent) {
					this.swipeVelocity = minimumSwipeSpeed * (goNext ? 1 : -1)
				}
			}

			if (wrapAround && !carousel) {
				if (this.currentSelection > this.selectionCount - 1) {
					this.currentSelection = 0
					this.setState(prevState => {
						return {
							swipePosition: prevState.swipePosition - this.swipeAmount * this.selectionCount,
						}
					})
				} else if (this.currentSelection < 0) {
					this.currentSelection = this.selectionCount - 1
					this.setState(prevState => {
						return {
							swipePosition: prevState.swipePosition + this.swipeAmount * this.selectionCount,
						}
					})
				}

				if (this.desiredSelection > this.selectionCount - 1) this.desiredSelection = 0
				else if (this.desiredSelection < 0) this.desiredSelection = this.selectionCount - 1
			}

			this.currentOffset = this.desiredOffset
			this.desiredOffset = this.swipeAmount * this.desiredSelection
			this.swipeTimer = new Date().getMilliseconds()
		}
		this.setState({ render: true }) // needed only for carousel??
		this.isTouching = false
	}

	clampDesiredSelection() {
		const { wrapAround, visibleCount, carousel } = this.props

		if (!wrapAround)
			this.desiredSelection = Math.min(
				Math.max(this.desiredSelection, 0),
				Math.max(this.selectionCount - visibleCount, 0)
			)
	}

	handleTouchMove(e) {
		this.handleMouseMove({ pageX: e.targetTouches[0].pageX, pageY: e.targetTouches[0].pageY })
	}

	handleMouseMove(e) {
		const {
			vertical,
			swipeRatio,
			startSwiping,
			wrapAround,
			visibleCount,
			carousel,
			disabled,
			startSwipeAmount,
		} = this.props

		if (!disabled) {
			// only consider movements when touching and more than one selection
			if (this.isTouching && this.selectionCount > 1) {
				const touchLocation = vertical ? e.pageY : e.pageX

				// Only consider movements in swiping direction (i.e. ignore vertical movements for horizontal swiping)
				if (this.lastTouchLocation !== touchLocation) {
					// Determine when swiping begins
					if (!this.isSwiping) {
						if (Math.abs(touchLocation - this.swipeStart) / swipeRatio > startSwipeAmount) {
							this.isSwiping = true
							if (startSwiping) startSwiping(this.isTouching)
						}

						// Swiping in progress
					} else {
						const swipeMovement = (this.lastTouchLocation - touchLocation) / swipeRatio
						this.lastTouchLocation = touchLocation
						let newSwipePosition = this.state.swipePosition + swipeMovement

						// Prevent wrap around swiping if not wanted
						if (!wrapAround || carousel) {
							if (this.state.swipePosition <= 0 && swipeMovement < 0) newSwipePosition = 0
							if (
								this.state.swipePosition >=
									this.swipeAmount * (this.selectionCount - visibleCount) &&
								swipeMovement > 0
							)
								newSwipePosition = this.swipeAmount * (this.selectionCount - visibleCount)
						}

						// Calculate swipe velocity and update position
						const newSwipeTimer = new Date().getMilliseconds()
						let correctedSwipeTimer = newSwipeTimer + (newSwipeTimer < this.swipeTimer ? 1000 : 0)
						this.swipeVelocity = Math.round(
							(swipeMovement * 1000) / (correctedSwipeTimer - this.swipeTimer)
						)
						this.swipeTimer = newSwipeTimer

						this.setState({ swipePosition: newSwipePosition })
					}
				}
			}
		} else if (this.isSwiping) this.doneSwiping()
	}

	componentDidUpdate(prevProps) {
		const {
			carousel,
			wrapAround,
			visibleCount,
			detent,
			swipeAmount,
			deceleration,
			firstSelection,
			resetSwiper,
			desiredSelection,
			desiredSelectionTime,
		} = this.props

		if (resetSwiper && resetSwiper !== prevProps.resetSwiper)
			this.setState({ swipePosition: firstSelection * this.swipeAmount })
		else {
			// See if the user requests a new selection without swiping (ex. clicking home button)
			if (
				desiredSelection !== this.currentSelection &&
				desiredSelection !== prevProps.desiredSelection
			) {
				this.desiredSelection = desiredSelection
				this.desiredOffset = desiredSelection * this.swipeAmount

				// If swiper desiredSelectionTime is zero (or not specified), go straight to index w/o transition
				if (!desiredSelectionTime) {
					this.currentSelection = this.desiredSelection
					this.stopSwiping()

					// Transition swipe to desiredSelection
				} else {
					const selectionDelta = this.currentSelection - this.desiredSelection
					// Allow for swiping to neighbor on other side of wrap around
					if (
						wrapAround &&
						this.selectionCount > 2 &&
						((this.currentSelection == 0 && this.desiredSelection == this.selectionCount - 1) ||
							(this.currentSelection == this.selectionCount - 1 && this.desiredSelection == 0))
					) {
						this.swipeVelocity =
							((this.swipeAmount * (this.selectionCount - Math.abs(selectionDelta))) /
								desiredSelectionTime) *
							Math.sign(selectionDelta)
					} else {
						this.swipeVelocity = (-this.swipeAmount * selectionDelta) / desiredSelectionTime
					}

					this.swipeTimer = new Date().getMilliseconds()
					this.isSwiping = true
				}
			}

			// Finishes swiping after user let's go
			if (!this.isTouching && this.isSwiping) {
				const swipeUpdateTime = 10
				setTimeout(() => {
					// Calculate next swipe offset based on velocity
					const newSwipeTimer = new Date().getMilliseconds()
					let correctedSwipeTimer = newSwipeTimer + (newSwipeTimer < this.swipeTimer ? 1000 : 0)
					let newSwipePosition = Math.round(
						this.state.swipePosition +
							(this.swipeVelocity * (correctedSwipeTimer - this.swipeTimer)) / 1000
					)

					// Slow velocity down if carousel
					if (carousel) {
						const newVelocity =
							this.swipeVelocity -
							deceleration * (correctedSwipeTimer - this.swipeTimer) * Math.sign(this.swipeVelocity)

						// prevent sign change
						if (this.swipeVelocity / newVelocity < 0) {
							if (detent) {
								this.swipeVelocity = this.stopVelocity * Math.sign(this.swipeVelocity)
							} else {
								this.stopSwiping()
								return
							}
						} else this.swipeVelocity = newVelocity
					}

					this.swipeTimer = newSwipeTimer

					// Correct selection and offsets for overflow condition
					let correctedDesiredSelection = this.desiredSelection
					let correctedOffset = this.desiredOffset
					if (wrapAround) {
						if (
							this.currentSelection == 0 &&
							this.desiredSelection == this.selectionCount - 1 &&
							newSwipePosition < correctedOffset
						) {
							correctedDesiredSelection = -1
							correctedOffset = -this.swipeAmount
						} else if (
							this.currentSelection == this.selectionCount - 1 &&
							this.desiredSelection == 0 &&
							newSwipePosition > correctedOffset
						) {
							correctedDesiredSelection = this.selectionCount
							correctedOffset = this.selectionCount * this.swipeAmount
						}
					}

					// If current selection got to desired selection
					if (
						(this.currentSelection > correctedDesiredSelection &&
							newSwipePosition < correctedOffset) ||
						(this.currentSelection < correctedDesiredSelection &&
							newSwipePosition > correctedOffset)
					) {
						this.currentSelection = this.desiredSelection

						// Check conditions to stop swiping

						// one neighbor
						if (!carousel) this.stopSwiping()
						// Beginning and end of selections
						else if (this.currentSelection == 0 && this.swipeVelocity < 0) {
							this.stopSwiping()
						} else if (
							this.currentSelection >= this.selectionCount - visibleCount &&
							this.swipeVelocity > 0
						)
							this.stopSwiping()
						else {
							let finalVelocity = this.stopVelocity
							if (carousel && detent) {
								// Check if velocity is too slow to make it through next selection w/ constant acceleration formula
								finalVelocity =
									Math.sqrt(
										Math.pow(this.swipeVelocity, 2) -
											2 * deceleration * 1000 * this.swipeAmount +
											100
									) || 0
							}

							if (finalVelocity < this.stopVelocity) {
								this.stopSwiping()
							} else {
								// Continue swiping to the next selection
								this.desiredSelection += Math.sign(this.swipeVelocity)
								this.desiredOffset = this.desiredSelection * this.swipeAmount
								this.setState({ swipePosition: newSwipePosition })
							}
						}
					} else if (this.isSwiping) {
						this.setState({ swipePosition: newSwipePosition })
					}
				}, swipeUpdateTime)
			}

			if (swipeAmount !== prevProps.swipeAmount) this.setWrapperStyle(swipeAmount)
		}
	}

	// Stop swiping method
	stopSwiping() {
		const { detent, updateCurrentSelection, carousel, minimumSwipeSpeed } = this.props

		if (!carousel || detent || Math.abs(this.swipeVelocity) > minimumSwipeSpeed) {
			this.setState({ swipePosition: this.desiredOffset })
		}

		this.swipeVelocity = 0
		this.isSwiping = false

		if (updateCurrentSelection)
			setTimeout(() => updateCurrentSelection(this.currentSelection, this.onSwipeSpace), 100)
	}

	childTranslator(child, offsetAmount, selection) {
		const { vertical, noSelectionWrapper } = this.props

		let xOffset = 0
		let yOffset = 0
		if (vertical) yOffset = offsetAmount
		else xOffset = offsetAmount

		const style = {
			position: 'absolute',
			transform: `translate3d(${xOffset}px, ${yOffset}px, 0)`,
		}

		let ref = null
		if (selection === this.currentSelection) ref = this.currentSelectionRef

		if (noSelectionWrapper) {
			const clonedStyle = Object.assign({}, child.props.style, style)
			return React.cloneElement(child, { style: clonedStyle, ref })
		}

		return (
			<div style={style} ref={ref}>
				{child}
			</div>
		)
	}

	componentDidMount() {
		if (this.selectionCount > 0) this.setWrapperStyle(this.props.swipeAmount)
	}

	render() {
		const { wrapAround, children, carousel, neighborsOnly } = this.props

		this.selectionCount = this.childCount() // update count if children change

		const pageWithStyle = React.Children.map(children, (child, index) => {
			if (!child) return null

			// Adjust the index to allow for wrap around if wanted
			let adjustedIndex = index

			if (wrapAround && !carousel) {
				// only two selections
				if (this.selectionCount === 2) {
					if (this.currentSelection == 0) {
						if (this.state.swipePosition < 0 && index == 1) adjustedIndex = -1
					} else if (this.currentSelection == 1) {
						if (this.state.swipePosition > this.swipeAmount && index == 0) adjustedIndex = 2
					}

					// more than two selections
				} else if (this.selectionCount > 2) {
					if (this.currentSelection == 0) {
						if (index == this.selectionCount - 1) adjustedIndex = -1
					} else if (this.currentSelection == this.selectionCount - 1) {
						if (index == 0) adjustedIndex = this.selectionCount
					}
				}
			}

			const totalSwipeAmount = adjustedIndex * this.swipeAmount - this.state.swipePosition

			if (neighborsOnly) {
				// Only put current selection and neighbors on swiper
				if (
					(adjustedIndex > this.currentSelection - 2 &&
						adjustedIndex < this.currentSelection + 2) ||
					(index == 0 && this.currentSelection == this.selectionCount - 1) ||
					(index == this.selectionCount - 1 && this.currentSelection == 0)
				) {
					return this.childTranslator(child, totalSwipeAmount, adjustedIndex)
				} else {
					// Don't render other selections
					return null
				}
			} else {
				return this.childTranslator(child, totalSwipeAmount, adjustedIndex)
			}
		})

		return (
			<div
				style={this.wrapperStyle}
				onMouseDown={this.handleMouseDown.bind(this)}
				onTouchStart={this.handleTouchDown.bind(this)}
				onMouseMove={this.handleMouseMove.bind(this)}
				onTouchMove={this.handleTouchMove.bind(this)}
				onMouseUp={this.handleMouseUp.bind(this)}
				onTouchEnd={this.handleMouseUp.bind(this)}
				onMouseLeave={this.handleMouseLeave.bind(this)}
				onTouchCancel={this.handleMouseLeave.bind(this)}>
				{pageWithStyle}
			</div>
		)
	}
}

Swiper.propTypes = {
	swipeAmount: PropTypes.number,
	firstSelection: PropTypes.number,
	desiredSelection: PropTypes.number,
	desiredSelectionTime: PropTypes.number,
	vertical: PropTypes.bool,
	minimumSwipeSpeed: PropTypes.number,
	carousel: PropTypes.bool,
	wrapAround: PropTypes.bool,
	neighborsOnly: PropTypes.bool,
	visibleCount: PropTypes.number,
	detent: PropTypes.bool,
	deceleration: PropTypes.number,
	swipeRatio: PropTypes.number,
	startSwipeAmount: PropTypes.number,
	noSelectionWrapper: PropTypes.bool,
	resetSwiper: PropTypes.bool,
	overflow: PropTypes.bool,
	startSwiping: PropTypes.func,
	updateCurrentSelection: PropTypes.func,
}

Swiper.defaultProps = {
	firstSelection: 0,
	minimumSwipeSpeed: 500,
	visibleCount: 1,
	deceleration: 3,
	swipeRatio: 1,
	startSwipeAmount: 15,
}

export default Swiper
